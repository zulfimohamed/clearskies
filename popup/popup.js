(async function () {
  const siteLabel = document.getElementById("site-label");
  const jargonCount = document.getElementById("jargon-count");
  const toggle = document.getElementById("toggle-decode");
  const inputText = document.getElementById("input-text");
  const corporateifyBtn = document.getElementById("corporateify-btn");
  const outputWrap = document.getElementById("output-wrap");
  const outputText = document.getElementById("output-text");
  const copyBtn = document.getElementById("copy-btn");

  const dictionary = await fetch(chrome.runtime.getURL("dictionary.json")).then((r) => r.json());

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const isScriptable = tab && tab.url && /^https?:\/\//.test(tab.url);

  if (isScriptable) {
    try {
      const url = new URL(tab.url);
      siteLabel.textContent = url.hostname;
    } catch (e) {
      siteLabel.textContent = "this page";
    }

    try {
      const state = await chrome.tabs.sendMessage(tab.id, { type: "CLEARSKIES_GET_STATE" });
      toggle.checked = !!state.enabled;
    } catch (e) {
      toggle.checked = true;
    }

    try {
      const badgeText = await chrome.action.getBadgeText({ tabId: tab.id });
      jargonCount.textContent = badgeText
        ? `${badgeText} jargon term${badgeText === "1" ? "" : "s"} found`
        : "No jargon found (yet)";
    } catch (e) {
      jargonCount.textContent = "";
    }
  } else {
    siteLabel.textContent = "not available on this page";
    toggle.disabled = true;
    jargonCount.textContent = "";
  }

  toggle.addEventListener("change", async () => {
    if (!isScriptable) return;
    try {
      await chrome.tabs.sendMessage(tab.id, {
        type: "CLEARSKIES_TOGGLE",
        enabled: toggle.checked,
      });
    } catch (e) {
      // content script not present on this page; nothing to do
    }
  });

  corporateifyBtn.addEventListener("click", () => {
    const text = inputText.value.trim();
    if (!text) return;
    const result = window.ClearSkies.corporateify(text, dictionary);
    outputText.textContent = result;
    outputWrap.classList.remove("hidden");
  });

  copyBtn.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(outputText.textContent);
      copyBtn.textContent = "Copied!";
      setTimeout(() => (copyBtn.textContent = "Copy"), 1200);
    } catch (e) {
      copyBtn.textContent = "Couldn't copy";
      setTimeout(() => (copyBtn.textContent = "Copy"), 1200);
    }
  });
})();
