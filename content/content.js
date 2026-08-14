(function () {
  const SKIP_TAGS = new Set([
    "SCRIPT", "STYLE", "NOSCRIPT", "TEXTAREA", "INPUT", "SELECT",
    "IFRAME", "OBJECT", "SVG", "CANVAS", "CODE", "PRE",
  ]);
  const TERM_CLASS = "clearskies-term";
  const HOST_KEY = `clearskies_enabled_${location.hostname}`;

  let dictionary = null;
  let termRegex = null;
  let enabled = true;

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
    if (el.closest && el.closest(`.${TERM_CLASS}, .clearskies-toast, .clearskies-card`)) return true;
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

  function runScan() {
    if (!enabled) {
      reportCount(0);
      return;
    }
    const count = highlightPage();
    reportCount(count);
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

  function showCorporateifyCard(original, result) {
    document.querySelectorAll(".clearskies-card").forEach((c) => c.remove());

    const card = document.createElement("div");
    card.className = "clearskies-card";
    card.innerHTML = `
      <div class="clearskies-card-header">
        <span>🌤️ Corporate-ified</span>
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

    const stored = await chrome.storage.local.get(HOST_KEY);
    enabled = stored[HOST_KEY] !== false;

    runScan();
  }

  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === "CLEARSKIES_TOGGLE") {
      enabled = message.enabled;
      chrome.storage.local.set({ [HOST_KEY]: enabled });
      if (enabled) {
        runScan();
      } else {
        removeHighlights();
        reportCount(0);
      }
      sendResponse({ ok: true });
    }

    if (message.type === "CLEARSKIES_GET_STATE") {
      sendResponse({ enabled });
    }

    if (message.type === "CLEARSKIES_CORPORATEIFY_SELECTION") {
      if (!dictionary) {
        sendResponse({ ok: false });
        return;
      }
      const result = window.ClearSkies.corporateify(message.text, dictionary);
      showCorporateifyCard(message.text, result);
      sendResponse({ ok: true });
    }

    return true;
  });

  init();
})();
