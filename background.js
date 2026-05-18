const DEFAULT_API_URL = "http://localhost:8000";

function getSettings(callback) {
  chrome.storage.local.get(["gilog_token", "gilog_url"], (result) => {
    callback({
      token: result.gilog_token || "",
      url: result.gilog_url || DEFAULT_API_URL,
    });
  });
}

chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === "save") {
    getSettings(({ token, url }) => {
      fetch(`${url}/exchanges`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({
          external_session_id: msg.external_session_id,
          platform: msg.platform,
          user_msg: msg.userMsg,
          assistant_msg: msg.assistantMsg,
        }),
      })
        .then((res) => res.json())
        .then((data) => console.log("[gi-log] saved:", data))
        .catch((err) => console.error("[gi-log] error:", err));
    });
  }

  if (msg.type === "search") {
    getSettings(({ token, url }) => {
      fetch(`${url}/search`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}` },
        body: JSON.stringify({ query: msg.query }),
      })
        .then((res) => res.json().then((data) => res.ok ? data : Promise.reject(data.detail || "Request failed")))
        .then((data) => sendResponse(data))
        .catch((err) => sendResponse({ error: typeof err === "string" ? err : err.message }));
    });
    return true;
  }

  if (msg.type === "preSearch") {
    getSettings(({ token, url }) => {
      fetch(`${url}/search/preSearchProcess`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ query: msg.query }),
      })
        .then((res) => res.json())
        .then((data) => sendResponse(data))
        .catch(() => sendResponse({ query: msg.query }));
    });
    return true;
  }

  if (msg.type === "postSearch") {
    getSettings(({ token, url }) => {
      fetch(`${url}/search/postSearchProcess`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ original_query: msg.originalQuery, results: msg.results }),
      })
        .then((res) => res.json())
        .then((data) => sendResponse(data))
        .catch((err) => sendResponse({ error: err.message }));
    });
    return true;
  }
});
