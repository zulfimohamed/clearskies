const CONTEXT_MENU_ID = "clearskies-corporateify";

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: CONTEXT_MENU_ID,
    title: "Corporate-ify this",
    contexts: ["selection"],
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId !== CONTEXT_MENU_ID || !tab || !tab.id) return;
  chrome.tabs.sendMessage(tab.id, {
    type: "CLEARSKIES_CORPORATEIFY_SELECTION",
    text: info.selectionText || "",
  });
});

chrome.runtime.onMessage.addListener((message, sender) => {
  if (message.type === "CLEARSKIES_COUNT" && sender.tab && sender.tab.id != null) {
    const count = message.count || 0;
    chrome.action.setBadgeText({
      tabId: sender.tab.id,
      text: count > 0 ? String(count) : "",
    });
    chrome.action.setBadgeBackgroundColor({ tabId: sender.tab.id, color: "#4299e1" });
  }
});
