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

  const PROVIDER_FIELDS = {
    anthropic: {
      wrapId: "anthropic-key-wrap",
      keyInputId: "ai-key-input",
      keyStorage: "clearskies_api_key",
    },
    openrouter: {
      wrapId: "openrouter-key-wrap",
      keyInputId: "openrouter-key-input",
      keyStorage: "clearskies_openrouter_key",
      modelInputId: "openrouter-model-input",
      modelStorage: "clearskies_openrouter_model",
    },
    openai: {
      wrapId: "openai-key-wrap",
      keyInputId: "openai-key-input",
      keyStorage: "clearskies_openai_key",
      modelInputId: "openai-model-input",
      modelStorage: "clearskies_openai_model",
    },
    gemini: {
      wrapId: "gemini-key-wrap",
      keyInputId: "gemini-key-input",
      keyStorage: "clearskies_gemini_key",
      modelInputId: "gemini-model-input",
      modelStorage: "clearskies_gemini_model",
    },
  };

  for (const field of Object.values(PROVIDER_FIELDS)) {
    field.wrapEl = document.getElementById(field.wrapId);
    field.keyEl = document.getElementById(field.keyInputId);
    if (field.modelInputId) field.modelEl = document.getElementById(field.modelInputId);
  }

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

  const storageKeys = ["clearskies_ai_enabled", "clearskies_ai_provider"];
  for (const field of Object.values(PROVIDER_FIELDS)) {
    storageKeys.push(field.keyStorage);
    if (field.modelStorage) storageKeys.push(field.modelStorage);
  }
  const aiSettings = await chrome.storage.local.get(storageKeys);

  const provider = aiSettings.clearskies_ai_provider || "anthropic";
  toggleAi.checked = !!aiSettings.clearskies_ai_enabled;
  providerSelect.value = provider;

  for (const field of Object.values(PROVIDER_FIELDS)) {
    field.keyEl.value = aiSettings[field.keyStorage] || "";
    if (field.modelEl) field.modelEl.value = aiSettings[field.modelStorage] || "";
  }

  function renderAiSettingsVisibility() {
    aiSettingsWrap.classList.toggle("hidden", !toggleAi.checked);
    for (const [name, field] of Object.entries(PROVIDER_FIELDS)) {
      field.wrapEl.classList.toggle("hidden", name !== providerSelect.value);
    }
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

  for (const field of Object.values(PROVIDER_FIELDS)) {
    field.keyEl.addEventListener("change", () => {
      chrome.storage.local.set({ [field.keyStorage]: field.keyEl.value.trim() });
    });
    if (field.modelEl) {
      field.modelEl.addEventListener("change", () => {
        chrome.storage.local.set({ [field.modelStorage]: field.modelEl.value.trim() });
      });
    }
  }

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
