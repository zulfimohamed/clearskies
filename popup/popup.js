(async function () {
  const siteLabel = document.getElementById("site-label");
  const jargonCount = document.getElementById("jargon-count");
  const toggle = document.getElementById("toggle-decode");
  const inputText = document.getElementById("input-text");
  const corporateifyBtn = document.getElementById("corporateify-btn");
  const outputWrap = document.getElementById("output-wrap");
  const outputLabel = document.getElementById("output-label");
  const outputText = document.getElementById("output-text");
  const copyBtn = document.getElementById("copy-btn");
  const toggleAi = document.getElementById("toggle-ai");
  const aiSettingsWrap = document.getElementById("ai-settings");
  const providerSelect = document.getElementById("provider-select");
  const anthropicKeyWrap = document.getElementById("anthropic-key-wrap");
  const aiKeyInput = document.getElementById("ai-key-input");
  const openrouterKeyWrap = document.getElementById("openrouter-key-wrap");
  const openrouterKeyInput = document.getElementById("openrouter-key-input");
  const openrouterModelInput = document.getElementById("openrouter-model-input");

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

  const aiSettings = await chrome.storage.local.get([
    "clearskies_ai_enabled",
    "clearskies_ai_provider",
    "clearskies_api_key",
    "clearskies_openrouter_key",
    "clearskies_openrouter_model",
  ]);

  const provider = aiSettings.clearskies_ai_provider || "anthropic";

  toggleAi.checked = !!aiSettings.clearskies_ai_enabled;
  providerSelect.value = provider;
  aiKeyInput.value = aiSettings.clearskies_api_key || "";
  openrouterKeyInput.value = aiSettings.clearskies_openrouter_key || "";
  openrouterModelInput.value = aiSettings.clearskies_openrouter_model || "";

  function renderAiSettingsVisibility() {
    aiSettingsWrap.classList.toggle("hidden", !toggleAi.checked);
    const isOpenRouter = providerSelect.value === "openrouter";
    anthropicKeyWrap.classList.toggle("hidden", isOpenRouter);
    openrouterKeyWrap.classList.toggle("hidden", !isOpenRouter);
  }
  renderAiSettingsVisibility();

  toggleAi.addEventListener("change", () => {
    renderAiSettingsVisibility();
    chrome.storage.local.set({ clearskies_ai_enabled: toggleAi.checked });
  });

  providerSelect.addEventListener("change", () => {
    renderAiSettingsVisibility();
    chrome.storage.local.set({ clearskies_ai_provider: providerSelect.value });
  });

  aiKeyInput.addEventListener("change", () => {
    chrome.storage.local.set({ clearskies_api_key: aiKeyInput.value.trim() });
  });

  openrouterKeyInput.addEventListener("change", () => {
    chrome.storage.local.set({ clearskies_openrouter_key: openrouterKeyInput.value.trim() });
  });

  openrouterModelInput.addEventListener("change", () => {
    chrome.storage.local.set({ clearskies_openrouter_model: openrouterModelInput.value.trim() });
  });

  corporateifyBtn.addEventListener("click", async () => {
    const text = inputText.value.trim();
    if (!text) return;

    corporateifyBtn.disabled = true;
    corporateifyBtn.textContent = "Corporate-ifying…";

    const { result, source, aiError } = await chrome.runtime.sendMessage({
      type: "CLEARSKIES_CORPORATEIFY_REQUEST",
      text,
    });

    outputLabel.textContent = source === "ai" ? "✨ AI-generated" : "📖 Dictionary-based";
    if (aiError) outputLabel.textContent += " (AI unavailable, fell back)";
    outputText.textContent = result;
    outputWrap.classList.remove("hidden");

    corporateifyBtn.disabled = false;
    corporateifyBtn.textContent = "Corporate-ify";
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
