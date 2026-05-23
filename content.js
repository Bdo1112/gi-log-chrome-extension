let debounceTimer = null;
let lastSavedMsg = null;

function getMessages() {
  const userEls = document.querySelectorAll('[data-message-author-role="user"]');
  const assistantEls = document.querySelectorAll('[data-message-author-role="assistant"]');

  if (userEls.length === 0 || assistantEls.length === 0) return null;

  const userEl = userEls[userEls.length - 1];
  const assistantEl = assistantEls[assistantEls.length - 1];

  return {
    userMsg: userEl.innerText.trim(),
    assistantMsg: assistantEl.innerText.trim(),
  };
}

const INCOMPLETE_PATTERNS = ["Thinking", "thinking…", "thinking..."];

function isIncomplete(text) {
  return !text || INCOMPLETE_PATTERNS.some(p => text === p || text.startsWith(p));
}

const observer = new MutationObserver(() => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    const msgs = getMessages();
    const sessionId = window.location.pathname.split("/").pop();

    if (!msgs || isIncomplete(msgs.assistantMsg)) return;
    if (msgs.assistantMsg === lastSavedMsg) return;

    lastSavedMsg = msgs.assistantMsg;

    const payload = {
      ...msgs,
      external_session_id: sessionId,
      platform: window.location.hostname,
      captured_at: new Date().toISOString(),
    };

    console.log("[gi-log] captured:", payload);

    try {
      chrome.runtime.sendMessage({ type: "save", ...payload });
    } catch (e) {
      console.warn("[gi-log] extension context invalidated — refresh this tab to reconnect");
    }
  }, 2000);
});

observer.observe(document.body, { childList: true, subtree: true });
