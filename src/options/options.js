const els = {
  enabled: document.getElementById("enabled"),
  uaProfile: document.getElementById("uaProfile"),
  rewriteHeaders: document.getElementById("rewriteHeaders"),
  stripReferer: document.getElementById("stripReferer"),
  spoofUserAgent: document.getElementById("spoofUserAgent"),
  reduceTimerPrecision: document.getElementById("reduceTimerPrecision"),
  spoofTimezone: document.getElementById("spoofTimezone"),
  blockSensors: document.getElementById("blockSensors"),
  exemptDomains: document.getElementById("exemptDomains"),
  save: document.getElementById("save"),
  reset: document.getElementById("reset"),
  saved: document.getElementById("saved")
};

let savedTimer = null;

function flash(msg) {
  els.saved.textContent = msg;
  els.saved.classList.add("on");
  if (savedTimer) clearTimeout(savedTimer);
  savedTimer = setTimeout(() => {
    els.saved.classList.remove("on");
    els.saved.textContent = "";
  }, 1600);
}

// normalise the exempt list - lowercase, strip schemes/paths, dedupe.
// keeps the textarea tidy on save and avoids "Real.com" vs "real.com"
// being treated as different entries
function cleanDomains(text) {
  return text
    .split(/\r?\n/)
    .map(s => s.trim().toLowerCase())
    .filter(s => s.length && !s.startsWith("#"))
    .map(s => s.replace(/^https?:\/\//, "").replace(/\/.*$/, ""))
    .filter((v, i, a) => a.indexOf(v) === i);
}

async function load() {
  const s = await browser.runtime.sendMessage({ kind: "settings:get" });
  els.enabled.checked = !!s.enabled;
  els.uaProfile.value = s.uaProfile;
  els.rewriteHeaders.checked = !!s.rewriteHeaders;
  els.stripReferer.checked = !!s.stripReferer;
  els.spoofUserAgent.checked = !!s.spoofUserAgent;
  els.reduceTimerPrecision.checked = !!s.reduceTimerPrecision;
  els.spoofTimezone.checked = !!s.spoofTimezone;
  els.blockSensors.checked = !!s.blockSensors;
  els.exemptDomains.value = (s.exemptDomains || []).join("\n");
}

async function save() {
  const value = {
    enabled: els.enabled.checked,
    uaProfile: els.uaProfile.value,
    rewriteHeaders: els.rewriteHeaders.checked,
    stripReferer: els.stripReferer.checked,
    spoofUserAgent: els.spoofUserAgent.checked,
    reduceTimerPrecision: els.reduceTimerPrecision.checked,
    spoofTimezone: els.spoofTimezone.checked,
    blockSensors: els.blockSensors.checked,
    exemptDomains: cleanDomains(els.exemptDomains.value)
  };
  await browser.runtime.sendMessage({ kind: "settings:set", value });
  els.exemptDomains.value = value.exemptDomains.join("\n");
  flash("Saved");
}

async function reset() {
  const ok = confirm("Reset all settings and rotate the master seed? Every site you've visited will see a fresh identity.");
  if (!ok) return;
  await browser.runtime.sendMessage({ kind: "settings:reset" });
  await load();
  flash("Reset");
}

els.save.addEventListener("click", save);
els.reset.addEventListener("click", reset);

// flipping the master switch should take effect immediately, not wait
// for the Save button. matches how every other ext on the planet works
els.enabled.addEventListener("change", async () => {
  await browser.runtime.sendMessage({
    kind: "settings:set",
    value: { enabled: els.enabled.checked }
  });
  flash(els.enabled.checked ? "On" : "Off");
});

// ctrl-S to save because muscle memory
document.addEventListener("keydown", e => {
  if ((e.ctrlKey || e.metaKey) && e.key === "s") {
    e.preventDefault();
    save();
  }
});

load();
