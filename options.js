const tokenInput = document.getElementById("token-input");
const urlInput = document.getElementById("url-input");
const saveBtn = document.getElementById("save-btn");
const status = document.getElementById("status");

// Load saved values
chrome.storage.local.get(["gilog_token", "gilog_url"], (result) => {
  if (result.gilog_token) tokenInput.value = result.gilog_token;
  if (result.gilog_url) urlInput.value = result.gilog_url;
});

saveBtn.addEventListener("click", () => {
  const token = tokenInput.value.trim();
  const url = urlInput.value.trim() || "https://gi-log-api-production.up.railway.app";

  chrome.storage.local.set({ gilog_token: token, gilog_url: url }, () => {
    status.textContent = "Saved.";
    setTimeout(() => { status.textContent = ""; }, 2000);
  });
});
