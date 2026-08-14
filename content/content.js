(function () {
  const SKIP_TAGS = new Set([
    "SCRIPT", "STYLE", "NOSCRIPT", "TEXTAREA", "INPUT", "SELECT",
    "IFRAME", "OBJECT", "SVG", "CANVAS", "CODE", "PRE",
  ]);
  const TERM_CLASS = "clearskies-term";
  const MODE_KEY = `clearskies_mode_${location.hostname}`;
  const SEVERE_THRESHOLD = 16;
  const MODERATE_THRESHOLD = 6;

  let dictionary = null;
  let termRegex = null;
  let mode = "decode"; // "off" | "decode" | "turbulence"
  let turbulenceObserver = null;
  let seatbeltEl = null;
  let chimePlayedForThisLoad = false;

  function isEditable(node) {
    let el = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
    while (el) {
      if (el.isContentEditable) return true;
      el = el.parentElement;
    }
    return false;
  }

  function shouldSkip(el) {
    if (!el) return true;
    if (SKIP_TAGS.has(el.tagName)) return true;
    if (el.closest && el.closest(`.${TERM_CLASS}, .clearskies-toast, .clearskies-card, .clearskies-seatbelt`)) return true;
    return false;
  }

  function collectTextNodes(root) {
    const nodes = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (!node.nodeValue || !node.nodeValue.trim()) return NodeFilter.FILTER_REJECT;
        const parent = node.parentElement;
        if (shouldSkip(parent)) return NodeFilter.FILTER_REJECT;
        if (isEditable(node)) return NodeFilter.FILTER_REJECT;
        if (!termRegex.test(node.nodeValue)) return NodeFilter.FILTER_REJECT;
        termRegex.lastIndex = 0;
        return NodeFilter.FILTER_ACCEPT;
      },
    });
    let n;
    while ((n = walker.nextNode())) nodes.push(n);
    return nodes;
  }

  function highlightTextNode(textNode) {
    const text = textNode.nodeValue;
    termRegex.lastIndex = 0;
    const frag = document.createDocumentFragment();
    let lastIndex = 0;
    let match;
    let count = 0;

    while ((match = termRegex.exec(text))) {
      const entry = window.ClearSkies.findJargonAt(dictionary, match[0]);
      if (!entry) continue;

      if (match.index > lastIndex) {
        frag.appendChild(document.createTextNode(text.slice(lastIndex, match.index)));
      }

      const span = document.createElement("span");
      span.className = TERM_CLASS;
      span.setAttribute("data-tooltip", entry.plain);
      span.textContent = match[0];
      frag.appendChild(span);

      lastIndex = match.index + match[0].length;
      count++;
    }

    if (count === 0) return 0;

    if (lastIndex < text.length) {
      frag.appendChild(document.createTextNode(text.slice(lastIndex)));
    }

    textNode.parentNode.replaceChild(frag, textNode);
    return count;
  }

  function highlightPage() {
    if (!dictionary) return 0;
    const nodes = collectTextNodes(document.body);
    let total = 0;
    for (const node of nodes) total += highlightTextNode(node);
    return total;
  }

  function removeHighlights() {
    document.querySelectorAll(`.${TERM_CLASS}`).forEach((span) => {
      const text = document.createTextNode(span.textContent);
      span.parentNode.replaceChild(text, span);
    });
    document.body.normalize();
  }

  function reportCount(count) {
    chrome.runtime.sendMessage({ type: "CLEARSKIES_COUNT", count }).catch(() => {});
  }

  function seatbeltStatus(count) {
    if (count >= SEVERE_THRESHOLD) return { level: "severe", text: "Severe turbulence — brace for impact" };
    if (count >= MODERATE_THRESHOLD) return { level: "moderate", text: "Moderate turbulence" };
    if (count >= 1) return { level: "light", text: "Light chop" };
    return { level: "clear", text: "Clear skies" };
  }

  function ensureSeatbeltBadge() {
    if (seatbeltEl) return seatbeltEl;
    seatbeltEl = document.createElement("div");
    seatbeltEl.className = "clearskies-seatbelt";
    document.body.appendChild(seatbeltEl);
    return seatbeltEl;
  }

  function updateSeatbeltBadge(count) {
    const badge = ensureSeatbeltBadge();
    const status = seatbeltStatus(count);
    badge.dataset.level = status.level;
    badge.textContent = `✈️ ${status.text}`;
  }

  function removeSeatbeltBadge() {
    if (seatbeltEl) {
      seatbeltEl.remove();
      seatbeltEl = null;
    }
  }

  function playSeatbeltChime() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const now = ctx.currentTime;
      [880, 660].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = freq;
        const start = now + i * 0.4;
        gain.gain.setValueAtTime(0, start);
        gain.gain.linearRampToValueAtTime(0.2, start + 0.05);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.55);
        osc.connect(gain).connect(ctx.destination);
        osc.start(start);
        osc.stop(start + 0.6);
      });
    } catch (e) {
      // autoplay/audio restrictions — silently skip, this is an opt-in flourish
    }
  }

  async function maybePlayChime(totalCount) {
    if (chimePlayedForThisLoad || totalCount < SEVERE_THRESHOLD) return;
    const { clearskies_chime_enabled } = await chrome.storage.local.get("clearskies_chime_enabled");
    if (clearskies_chime_enabled) {
      chimePlayedForThisLoad = true;
      playSeatbeltChime();
    }
  }

  function teardownTurbulence() {
    if (turbulenceObserver) {
      turbulenceObserver.disconnect();
      turbulenceObserver = null;
    }
    removeSeatbeltBadge();
  }

  function initTurbulence(totalCount) {
    const visibleTerms = new Set();
    turbulenceObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            visibleTerms.add(entry.target);
            entry.target.classList.remove("clearskies-shake");
            void entry.target.offsetWidth; // restart the animation
            entry.target.classList.add("clearskies-shake");
          } else {
            visibleTerms.delete(entry.target);
          }
        }
        updateSeatbeltBadge(visibleTerms.size);
      },
      { threshold: 0.3 }
    );

    document.querySelectorAll(`.${TERM_CLASS}`).forEach((el) => turbulenceObserver.observe(el));
    updateSeatbeltBadge(0);
    maybePlayChime(totalCount);
  }

  function applyMode(newMode) {
    teardownTurbulence();
    removeHighlights();
    document.documentElement.removeAttribute("data-clearskies-mode");
    mode = newMode;

    if (mode === "off") {
      reportCount(0);
      return;
    }

    const count = highlightPage();
    document.documentElement.setAttribute("data-clearskies-mode", mode);
    reportCount(count);

    if (mode === "turbulence") {
      initTurbulence(count);
    }
  }

  function showToast(message) {
    document.querySelectorAll(".clearskies-toast").forEach((t) => t.remove());
    const toast = document.createElement("div");
    toast.className = "clearskies-toast";
    toast.textContent = message;
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add("clearskies-toast-visible"), 10);
    setTimeout(() => {
      toast.classList.remove("clearskies-toast-visible");
      setTimeout(() => toast.remove(), 300);
    }, 2400);
  }

  function showCorporateifyCard(result, source) {
    document.querySelectorAll(".clearskies-card").forEach((c) => c.remove());

    const badge = source === "ai" ? "✨ AI" : "📖 Dictionary";
    const card = document.createElement("div");
    card.className = "clearskies-card";
    card.innerHTML = `
      <div class="clearskies-card-header">
        <span>🌤️ Corporate-ified</span>
        <span class="clearskies-card-badge">${badge}</span>
        <button class="clearskies-card-close" aria-label="Close">×</button>
      </div>
      <div class="clearskies-card-body"></div>
      <div class="clearskies-card-actions">
        <button class="clearskies-card-copy">Copy</button>
      </div>
    `;
    card.querySelector(".clearskies-card-body").textContent = result;
    document.body.appendChild(card);

    card.querySelector(".clearskies-card-close").addEventListener("click", () => card.remove());
    card.querySelector(".clearskies-card-copy").addEventListener("click", async () => {
      try {
        await navigator.clipboard.writeText(result);
        showToast("Copied to clipboard ✅");
      } catch (e) {
        showToast("Couldn't copy — select and copy manually");
      }
    });
  }

  async function init() {
    const dictUrl = chrome.runtime.getURL("dictionary.json");
    dictionary = await fetch(dictUrl).then((r) => r.json());
    termRegex = window.ClearSkies.buildTermRegex(dictionary.terms);

    const stored = await chrome.storage.local.get(MODE_KEY);
    const initialMode = stored[MODE_KEY] || "decode";
    applyMode(initialMode);
  }

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "CLEARSKIES_SET_MODE") {
      chrome.storage.local.set({ [MODE_KEY]: message.mode });
      applyMode(message.mode);
      sendResponse({ ok: true });
    }

    if (message.type === "CLEARSKIES_GET_STATE") {
      sendResponse({ mode });
    }

    if (message.type === "CLEARSKIES_SHOW_CORPORATEIFY_RESULT") {
      showCorporateifyCard(message.result, message.source);
      if (message.aiError) {
        showToast("AI unavailable — used dictionary mode instead");
      }
      sendResponse({ ok: true });
    }

    return true;
  });

  init();
})();
