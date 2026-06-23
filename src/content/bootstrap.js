// Isolated-world loader. We sync-XHR the payload then inject it as an
// inline <script>. Has to be synchronous: if we wait for fetch() to resolve
// the page's own scripts have already run and grabbed the native APIs we
// want to wrap. ugly but it's the only way that beats document_start scripts.
(() => {
  const url = browser.runtime.getURL("src/content/payload.js");
  let code = "";
  try {
    const xhr = new XMLHttpRequest();
    xhr.open("GET", url, false);
    xhr.send();
    code = xhr.responseText;
  } catch (e) {
    return;
  }
  if (!code) return;

  const tag = document.createElement("script");
  tag.textContent = code;
  const root = document.head || document.documentElement || document;
  root.insertBefore(tag, root.firstChild);
  tag.remove();

  // ask the background for the per-origin seed + flags, forward to main world
  browser.runtime.sendMessage({ kind: "seed" }).then(cfg => {
    if (!cfg) return;
    const ev = new CustomEvent("__cham_cfg__", {
      detail: JSON.stringify(cfg)
    });
    document.dispatchEvent(ev);
  }).catch(() => {});
})();
