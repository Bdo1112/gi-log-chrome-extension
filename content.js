let debounceTimer = null;

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

function isStreamingDone() {
  const stopSelectors = [
    'button[aria-label="Stop streaming"]',
    'button[aria-label="Stop"]',
    '[data-testid="stop-button"]',
  ];
  return !stopSelectors.some(sel => document.querySelector(sel));
}

const observer = new MutationObserver(() => {
  if (!isStreamingDone()) return;

  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    const msgs = getMessages();
    const sessionId = window.location.pathname.split("/").pop();
    if (!msgs || !msgs.assistantMsg) return;

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
  }, 1500);
});

observer.observe(document.body, { childList: true, subtree: true });
