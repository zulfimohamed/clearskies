importScripts("../shared/corporateify.js");

const CONTEXT_MENU_ID = "clearskies-corporateify";

const PROMPT_PREFIX =
  "Rewrite the following text in over-the-top, insufferable corporate consultant jargon. " +
  "Keep it roughly the same length, make it sound self-important and buzzword-heavy, and it " +
  "should still be recognizable as the same message. Respond with ONLY the rewritten text, " +
  "no preamble, no quotes, no explanation.\n\n";

const ANTHROPIC_MODEL = "claude-haiku-4-5-20251001";
const ANTHROPIC_ENDPOINT = "https://api.anthropic.com/v1/messages";

async function callAnthropic(apiKey, _model, text) {
  const res = await fetch(ANTHROPIC_ENDPOINT, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model: ANTHROPIC_MODEL,
      max_tokens: 300,
      messages: [{ role: "user", content: PROMPT_PREFIX + text }],
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Anthropic API error ${res.status}: ${body.slice(0, 200)}`);
  }

  const data = await res.json();
  const result = data.content && data.content[0] && data.content[0].text;
  if (!result) throw new Error("Anthropic API returned no text");
  return result.trim();
}

const OPENROUTER_DEFAULT_MODEL = "meta-llama/llama-3.3-70b-instruct";
const OPENROUTER_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";

async function callOpenRouter(apiKey, model, text) {
  const res = await fetch(OPENROUTER_ENDPOINT, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
      "HTTP-Referer": "https://github.com/zulfimohamed/clearskies",
      "X-Title": "ClearSkies",
    },
    body: JSON.stringify({
      model: model || OPENROUTER_DEFAULT_MODEL,
      max_tokens: 300,
      messages: [{ role: "user", content: PROMPT_PREFIX + text }],
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`OpenRouter API error ${res.status}: ${body.slice(0, 200)}`);
  }

  const data = await res.json();
  const result = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
  if (!result) throw new Error("OpenRouter API returned no text");
  return result.trim();
}

const OPENAI_DEFAULT_MODEL = "gpt-4o-mini";
const OPENAI_ENDPOINT = "https://api.openai.com/v1/chat/completions";

async function callOpenAI(apiKey, model, text) {
  const res = await fetch(OPENAI_ENDPOINT, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: model || OPENAI_DEFAULT_MODEL,
      max_tokens: 300,
      messages: [{ role: "user", content: PROMPT_PREFIX + text }],
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`OpenAI API error ${res.status}: ${body.slice(0, 200)}`);
  }

  const data = await res.json();
  const result = data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
  if (!result) throw new Error("OpenAI API returned no text");
  return result.trim();
}

const GEMINI_DEFAULT_MODEL = "gemini-2.0-flash";
const GEMINI_ENDPOINT_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

async function callGemini(apiKey, model, text) {
  const m = model || GEMINI_DEFAULT_MODEL;
  const url = `${GEMINI_ENDPOINT_BASE}/${encodeURIComponent(m)}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: PROMPT_PREFIX + text }] }],
      generationConfig: { maxOutputTokens: 300 },
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Gemini API error ${res.status}: ${body.slice(0, 200)}`);
  }

  const data = await res.json();
  const candidate = data.candidates && data.candidates[0];
  const result = candidate && candidate.content && candidate.content.parts && candidate.content.parts[0] && candidate.content.parts[0].text;
  if (!result) throw new Error("Gemini API returned no text");
  return result.trim();
}

const PROVIDERS = {
  anthropic: { keyField: "clearskies_api_key", modelField: null, call: callAnthropic },
  openrouter: { keyField: "clearskies_openrouter_key", modelField: "clearskies_openrouter_model", call: callOpenRouter },
  openai: { keyField: "clearskies_openai_key", modelField: "clearskies_openai_model", call: callOpenAI },
  gemini: { keyField: "clearskies_gemini_key", modelField: "clearskies_gemini_model", call: callGemini },
};

const dictionaryPromise = fetch(chrome.runtime.getURL("dictionary.json")).then((r) => r.json());

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: CONTEXT_MENU_ID,
    title: "Corporate-ify this",
    contexts: ["selection"],
  });
});

async function corporateifySmart(text) {
  const dictionary = await dictionaryPromise;
  const storageKeys = ["clearskies_ai_enabled", "clearskies_ai_provider"];
  for (const p of Object.values(PROVIDERS)) {
    storageKeys.push(p.keyField);
    if (p.modelField) storageKeys.push(p.modelField);
  }
  const settings = await chrome.storage.local.get(storageKeys);

  const providerName = settings.clearskies_ai_provider || "anthropic";
  const provider = PROVIDERS[providerName];

  if (settings.clearskies_ai_enabled && provider) {
    try {
      const apiKey = settings[provider.keyField];
      if (!apiKey) throw new Error(`No ${providerName} API key set`);
      const model = provider.modelField ? settings[provider.modelField] : undefined;
      const result = await provider.call(apiKey, model, text);
      return { result, source: "ai" };
    } catch (e) {
      return {
        result: ClearSkies.corporateify(text, dictionary),
        source: "dictionary",
        aiError: e.message,
      };
    }
  }

  return { result: ClearSkies.corporateify(text, dictionary), source: "dictionary" };
}

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== CONTEXT_MENU_ID || !tab || !tab.id) return;
  const original = info.selectionText || "";
  const { result, source, aiError } = await corporateifySmart(original);
  chrome.tabs.sendMessage(tab.id, {
    type: "CLEARSKIES_SHOW_CORPORATEIFY_RESULT",
    original,
    result,
    source,
    aiError,
  });
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "CLEARSKIES_COUNT" && sender.tab && sender.tab.id != null) {
    const count = message.count || 0;
    chrome.action.setBadgeText({
      tabId: sender.tab.id,
      text: count > 0 ? String(count) : "",
    });
    chrome.action.setBadgeBackgroundColor({ tabId: sender.tab.id, color: "#4299e1" });
    return;
  }

  if (message.type === "CLEARSKIES_CORPORATEIFY_REQUEST") {
    corporateifySmart(message.text).then(sendResponse);
    return true;
  }

  return false;
});
