importScripts("../shared/corporateify.js");

const CONTEXT_MENU_ID = "clearskies-corporateify";

const ANTHROPIC_MODEL = "claude-haiku-4-5-20251001";
const ANTHROPIC_ENDPOINT = "https://api.anthropic.com/v1/messages";

const OPENROUTER_DEFAULT_MODEL = "meta-llama/llama-3.3-70b-instruct";
const OPENROUTER_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";

const PROMPT_PREFIX =
  "Rewrite the following text in over-the-top, insufferable corporate consultant jargon. " +
  "Keep it roughly the same length, make it sound self-important and buzzword-heavy, and it " +
  "should still be recognizable as the same message. Respond with ONLY the rewritten text, " +
  "no preamble, no quotes, no explanation.\n\n";

const dictionaryPromise = fetch(chrome.runtime.getURL("dictionary.json")).then((r) => r.json());

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: CONTEXT_MENU_ID,
    title: "Corporate-ify this",
    contexts: ["selection"],
  });
});

async function callAnthropic(apiKey, text) {
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

async function corporateifySmart(text) {
  const dictionary = await dictionaryPromise;
  const settings = await chrome.storage.local.get([
    "clearskies_ai_enabled",
    "clearskies_ai_provider",
    "clearskies_api_key",
    "clearskies_openrouter_key",
    "clearskies_openrouter_model",
  ]);

  const provider = settings.clearskies_ai_provider || "anthropic";

  if (settings.clearskies_ai_enabled) {
    try {
      let result;
      if (provider === "openrouter") {
        if (!settings.clearskies_openrouter_key) throw new Error("No OpenRouter API key set");
        result = await callOpenRouter(settings.clearskies_openrouter_key, settings.clearskies_openrouter_model, text);
      } else {
        if (!settings.clearskies_api_key) throw new Error("No Anthropic API key set");
        result = await callAnthropic(settings.clearskies_api_key, text);
      }
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
