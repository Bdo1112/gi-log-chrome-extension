const toggle = document.createElement("button");
toggle.id = "gi-log-toggle";
toggle.textContent = "gi-log";
document.body.appendChild(toggle);

const sidebar = document.createElement("div");
sidebar.id = "gi-log-sidebar";
sidebar.innerHTML =
  "<header>" +
  "<span>gi-log recall</span>" +
  "<button id='gi-log-close'>X</button>" +
  "</header>" +
  "<div id='gi-log-search-row'>" +
  "<input id='gi-log-search-input' type='text' placeholder='Search past conversations...' />" +
  "<button id='gi-log-search-btn'>Search</button>" +
  "</div>" +
  "<div id='gi-log-status'></div>" +
  "<div id='gi-log-answer'></div>" +
  "<div id='gi-log-results'></div>";
document.body.appendChild(sidebar);

toggle.addEventListener("click", function() { sidebar.classList.toggle("open"); });
document.getElementById("gi-log-close").addEventListener("click", function() { sidebar.classList.remove("open"); });

var input = document.getElementById("gi-log-search-input");
var status = document.getElementById("gi-log-status");
var answerEl = document.getElementById("gi-log-answer");
var resultsEl = document.getElementById("gi-log-results");
var searchBtn = document.getElementById("gi-log-search-btn");

function doSearch() {
  if (!input.value.trim()) return;
  status.textContent = "Thinking...";
  answerEl.innerHTML = "";
  resultsEl.innerHTML = "";
  runFullPipeline(input.value.trim());
}

searchBtn.addEventListener("click", doSearch);
input.addEventListener("keydown", function(e) { if (e.key === "Enter") doSearch(); });

function runFullPipeline(rawQuery) {
  // Step 1: preSearchProcess — reformulate the query
  chrome.runtime.sendMessage(
    { type: "preSearch", query: rawQuery },
    function(preRes) {
      var refinedQuery = (preRes && preRes.query) ? preRes.query : rawQuery;
      status.textContent = "Searching...";

      // Step 2: search with refined query
      chrome.runtime.sendMessage(
        { type: "search", query: refinedQuery, user_id: "local" },
        function(searchRes) {
          if (!searchRes || searchRes.error) {
            status.textContent = "";
            resultsEl.innerHTML =
              "<div class='gi-log-empty'>" +
              "<div class='gi-log-empty-icon'>⚠️</div>" +
              "<div class='gi-log-empty-title'>Search failed</div>" +
              "<div class='gi-log-empty-sub'>" + escapeHtml(searchRes ? searchRes.error : "Is the API running?") + "</div>" +
              "</div>";
            return;
          }

          if (!searchRes.results || searchRes.results.length === 0) {
            status.textContent = "";
            resultsEl.innerHTML =
              "<div class='gi-log-empty'>" +
              "<div class='gi-log-empty-icon'>🔍</div>" +
              "<div class='gi-log-empty-title'>Nothing found</div>" +
              "<div class='gi-log-empty-sub'>No past conversations match your search.</div>" +
              "</div>";
            return;
          }

          // Render raw results
          status.textContent = "";
          searchRes.results.forEach(function(r) {
            var el = document.createElement("div");
            el.className = "gi-log-result";
            el.innerHTML =
              "<div class='user-msg'>" + escapeHtml(r.user_msg) + "</div>" +
              "<div class='assistant-msg'>" + escapeHtml(r.assistant_msg) + "</div>" +
              "<button class='inject-btn'>Inject as context</button>";
            el.querySelector(".inject-btn").addEventListener("click", function(evt) {
              evt.stopPropagation();
              injectIntoChat("[Past context]\nQ: " + r.user_msg + "\nA: " + r.assistant_msg + "\n\n");
            });
            resultsEl.appendChild(el);
          });

          // Step 3: postSearchProcess — synthesize answer
          answerEl.innerHTML = "<div class='gi-log-answer-loading'>Synthesizing answer...</div>";
          chrome.runtime.sendMessage(
            { type: "postSearch", originalQuery: rawQuery, results: searchRes.results },
            function(postRes) {
              if (!postRes || postRes.error || !postRes.answer) {
                answerEl.innerHTML = "";
                return;
              }
              answerEl.innerHTML =
                "<div class='gi-log-answer-box'>" +
                "<div class='gi-log-answer-label'>gi-log says</div>" +
                "<div class='gi-log-answer-text'>" + escapeHtml(postRes.answer) + "</div>" +
                "<button class='inject-btn inject-answer-btn'>Inject answer as context</button>" +
                "</div>";
              answerEl.querySelector(".inject-answer-btn").addEventListener("click", function() {
                injectIntoChat("[Past context summary]\n" + postRes.answer + "\n\n");
              });
            }
          );
        }
      );
    }
  );
}

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function injectIntoChat(text) {
  var editor = document.getElementById("prompt-textarea");
  if (!editor) return;
  editor.focus();
  var range = document.createRange();
  var sel = window.getSelection();
  range.selectNodeContents(editor);
  range.collapse(false);
  sel.removeAllRanges();
  sel.addRange(range);
  document.execCommand("insertText", false, text);
}
