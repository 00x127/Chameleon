const els = {
  enabled: document.getElementById("enabled"),
  exempt: document.getElementById("exempt"),
  status: document.getElementById("status"),
  site: document.getElementById("site"),
  rotate: document.getElementById("rotate"),
  settings: document.getElementById("settings")
};

let cur = null;
let host = "";
let activeTabId = null;

// quick + dirty eTLD+1. wrong for co.uk style suffixes, see issue #TBD
function etld(h) {
  const p = h.split(".");
  if (p.length <= 2) return h;
  return p.slice(-2).join(".");
}

async function load() {
  cur = await browser.runtime.sendMessage({ kind: "settings:get" });

  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  activeTabId = tab ? tab.id : null;

  try {
    const u = new URL(tab.url);
    host = etld(u.hostname);
    els.site.textContent = host || "this site";
  } catch {
    host = "";
    els.site.textContent = "this tab";
  }

  els.enabled.checked = cur.enabled;
  els.exempt.checked = host && cur.exemptDomains.includes(host);
  paintStatus();
}

function paintStatus() {
  els.status.classList.remove("off");
  if (!cur.enabled) {
    els.status.textContent = "off";
    els.status.classList.add("off");
    return;
  }
  if (host && cur.exemptDomains.includes(host)) {
    els.status.textContent = "exempt for this site";
    els.status.classList.add("off");
    return;
  }
  els.status.textContent = "active";
}

async function reloadActive() {
  if (activeTabId != null) {
    try { await browser.tabs.reload(activeTabId); } catch (_) {}
  }
}

els.enabled.addEventListener("change", async () => {
  cur = await browser.runtime.sendMessage({
    kind: "settings:set",
    value: { enabled: els.enabled.checked }
  });
  paintStatus();
  await reloadActive();
  window.close();
});

els.exempt.addEventListener("change", async () => {
  if (!host) return;
  const list = new Set(cur.exemptDomains);
  if (els.exempt.checked) list.add(host); else list.delete(host);
  cur = await browser.runtime.sendMessage({
    kind: "settings:set",
    value: { exemptDomains: Array.from(list) }
  });
  paintStatus();
  await reloadActive();
  window.close();
});

els.rotate.addEventListener("click", async () => {
  await browser.runtime.sendMessage({ kind: "settings:reset" });
  await reloadActive();
  window.close();
});

els.settings.addEventListener("click", () => {
  browser.runtime.openOptionsPage();
  window.close();
});

load();
