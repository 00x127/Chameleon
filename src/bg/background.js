const defaults = {
  enabled: true,
  mode: "fake",
  exemptDomains: [],
  rewriteHeaders: true,
  stripReferer: true,
  spoofTimezone: true,
  blockSensors: true,
  reduceTimerPrecision: true,
  spoofUserAgent: true,
  uaProfile: "auto"
};

const uaProfiles = {
  "firefox-linux": {
    ua: "Mozilla/5.0 (X11; Linux x86_64; rv:128.0) Gecko/20100101 Firefox/128.0",
    acceptLang: "en-US,en;q=0.5",
    platform: "Linux x86_64",
    oscpu: "Linux x86_64",
    vendor: "",
    appVersion: "5.0 (X11)"
  },
  "firefox-windows": {
    ua: "Mozilla/5.0 (Windows NT 10.0; rv:128.0) Gecko/20100101 Firefox/128.0",
    acceptLang: "en-US,en;q=0.5",
    platform: "Win32",
    oscpu: "Windows NT 10.0; Win64; x64",
    vendor: "",
    appVersion: "5.0 (Windows)"
  },
  "firefox-mac": {
    ua: "Mozilla/5.0 (Macintosh; Intel Mac OS X 14.5; rv:128.0) Gecko/20100101 Firefox/128.0",
    acceptLang: "en-US,en;q=0.5",
    platform: "MacIntel",
    oscpu: "Intel Mac OS X 14.5",
    vendor: "",
    appVersion: "5.0 (Macintosh)"
  }
};

let settings = { ...defaults };
let masterSeed = null;
let loaded = false;

async function load() {
  const stored = await browser.storage.local.get(["settings", "masterSeed"]);
  if (stored.settings) settings = { ...defaults, ...stored.settings };
  if (stored.masterSeed) {
    masterSeed = stored.masterSeed;
  } else {
    masterSeed = freshSeed();
    await browser.storage.local.set({ masterSeed });
  }
  loaded = true;
}

function freshSeed() {
  const buf = new Uint8Array(32);
  crypto.getRandomValues(buf);
  return Array.from(buf, b => b.toString(16).padStart(2, "0")).join("");
}

// eTLD+1 approximation. Yes i know this is wrong for .co.uk etc.
// The proper fix is the public suffix list but pulling that in for
// what is essentially the "is this site allowed" check feels overkill.
function originOf(url) {
  try {
    const u = new URL(url);
    const parts = u.hostname.split(".");
    if (parts.length <= 2) return u.hostname;
    return parts.slice(-2).join(".");
  } catch {
    return "";
  }
}

function isExempt(url) {
  const host = originOf(url);
  if (!host) return false;
  return settings.exemptDomains.some(d => host === d || host.endsWith("." + d));
}

async function deriveSeed(origin) {
  const data = new TextEncoder().encode(masterSeed + "|" + origin);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf), b => b.toString(16).padStart(2, "0")).join("");
}

const autoProfileKeys = ["firefox-linux", "firefox-windows", "firefox-mac"];

function pickProfile(origin) {
  if (settings.uaProfile && settings.uaProfile !== "auto" && uaProfiles[settings.uaProfile]) {
    return uaProfiles[settings.uaProfile];
  }
  let h = 2166136261;
  const src = (masterSeed || "") + "|" + (origin || "");
  for (let i = 0; i < src.length; i++) {
    h ^= src.charCodeAt(i);
    h = (h * 16777619) >>> 0;
  }
  return uaProfiles[autoProfileKeys[h % autoProfileKeys.length]];
}

function originFromDetails(details) {
  try {
    const u = new URL(details.originUrl || details.documentUrl || details.url);
    const parts = u.hostname.split(".");
    if (parts.length <= 2) return u.hostname;
    return parts.slice(-2).join(".");
  } catch (_) {
    return "";
  }
}

browser.runtime.onMessage.addListener(async (msg, sender) => {
  if (!loaded) await load();

  if (msg.kind === "seed") {
    const origin = originOf(sender.url || "");
    if (!settings.enabled || isExempt(sender.url || "")) {
      return { active: false };
    }
    const seed = await deriveSeed(origin);
    return {
      active: true,
      seed,
      mode: settings.mode,
      flags: {
        spoofTimezone: settings.spoofTimezone,
        blockSensors: settings.blockSensors,
        reduceTimerPrecision: settings.reduceTimerPrecision,
        spoofUserAgent: settings.spoofUserAgent
      },
      profile: pickProfile(origin)
    };
  }

  if (msg.kind === "settings:get") return settings;

  if (msg.kind === "settings:set") {
    const prev = settings;
    settings = { ...settings, ...msg.value };
    await browser.storage.local.set({ settings });
    const prevExempt = JSON.stringify((prev.exemptDomains || []).slice().sort());
    const nextExempt = JSON.stringify((settings.exemptDomains || []).slice().sort());
    if (prev.enabled !== settings.enabled || prevExempt !== nextExempt) {
      await syncContentScripts();
    }
    return settings;
  }

  if (msg.kind === "settings:reset") {
    settings = { ...defaults };
    masterSeed = freshSeed();
    await browser.storage.local.set({ settings, masterSeed });
    await syncContentScripts();
    return settings;
  }
});

const dropRequestHeaders = new Set([
  "sec-ch-ua", "sec-ch-ua-mobile", "sec-ch-ua-platform", "sec-ch-ua-platform-version",
  "sec-ch-ua-arch", "sec-ch-ua-bitness", "sec-ch-ua-full-version", "sec-ch-ua-full-version-list",
  "sec-ch-ua-model", "sec-ch-ua-wow64", "x-client-data", "device-memory",
  "downlink", "ect", "rtt", "save-data", "viewport-width", "width"
]);


const refererSafeHosts = new Set([
  "challenges.cloudflare.com",
  "cloudflare.com",
  "hcaptcha.com",
  "recaptcha.net",
  "google.com",
  "accounts.google.com"
]);

function isCrossOrigin(details) {
  if (!details.originUrl) return true;
  try {
    const src = new URL(details.originUrl).origin;
    const dst = new URL(details.url).origin;
    return src !== dst;
  } catch (_) {
    return true;
  }
}

function shouldStripReferer(details) {
  if (!settings.stripReferer) return false;
  if (!isCrossOrigin(details)) return false;
  try {
    const host = new URL(details.url).hostname;
    for (const safe of refererSafeHosts) {
      if (host === safe || host.endsWith("." + safe)) return false;
    }
  } catch (_) {}
  return true;
}

function rewriteRequest(details) {
  if (!settings.enabled || !settings.rewriteHeaders) return;
  if (isExempt(details.url)) return;
  if (details.originUrl && isExempt(details.originUrl)) return;
  if (details.documentUrl && isExempt(details.documentUrl)) return;
  const profile = pickProfile(originFromDetails(details));
  const headers = details.requestHeaders;
  const out = [];
  let sawUA = false, sawLang = false;
  const stripReferer = shouldStripReferer(details);

  for (const h of headers) {
    const name = h.name.toLowerCase();
    if (dropRequestHeaders.has(name)) continue;
    if (name === "referer" && stripReferer) continue;
    if (name === "user-agent" && settings.spoofUserAgent) {
      out.push({ name: h.name, value: profile.ua });
      sawUA = true;
      continue;
    }
    if (name === "accept-language") {
      out.push({ name: h.name, value: profile.acceptLang });
      sawLang = true;
      continue;
    }
    out.push(h);
  }

  if (!sawUA && settings.spoofUserAgent) out.push({ name: "User-Agent", value: profile.ua });
  if (!sawLang) out.push({ name: "Accept-Language", value: profile.acceptLang });
  return { requestHeaders: out };
}

const dropResponseHeaders = new Set([
  "accept-ch",
  "critical-ch",
  "report-to",
  "reporting-endpoints",
  "permissions-policy-report-only",
  "nel"
]);

function scrubResponse(details) {
  if (!settings.enabled || isExempt(details.url)) return;
  if (details.originUrl && isExempt(details.originUrl)) return;
  if (details.documentUrl && isExempt(details.documentUrl)) return;
  return {
    responseHeaders: details.responseHeaders.filter(h => !dropResponseHeaders.has(h.name.toLowerCase()))
  };
}

browser.webRequest.onBeforeSendHeaders.addListener(
  rewriteRequest,
  { urls: ["<all_urls>"] },
  ["blocking", "requestHeaders"]
);

browser.webRequest.onHeadersReceived.addListener(
  scrubResponse,
  { urls: ["<all_urls>"] },
  ["blocking", "responseHeaders"]
);

// keep the badge in sync with enabled state so it's obvious at a glance
async function paintBadge() {
  try {
    if (!loaded) await load();
    const text = settings.enabled ? "" : "off";
    await browser.action.setBadgeText({ text });
    await browser.action.setBadgeBackgroundColor({ color: "#444" });
  } catch (e) {
    // browser.action might not be ready during early startup, but we ball
  }
}

const SCRIPT_ID = "chameleon-bootstrap";

function exemptMatchPatterns() {
  const out = [];
  for (const d of settings.exemptDomains) {
    if (typeof d !== "string" || !d.length) continue;
    out.push("*://" + d + "/*");
    out.push("*://*." + d + "/*");
  }
  return out;
}

async function syncContentScripts() {
  try {
    await browser.scripting.unregisterContentScripts({ ids: [SCRIPT_ID] });
  } catch (_) {}
  if (!settings.enabled) return;
  const opts = {
    id: SCRIPT_ID,
    matches: ["<all_urls>"],
    js: ["src/content/bootstrap.js"],
    runAt: "document_start",
    allFrames: true,
    persistAcrossSessions: true,
    matchOriginAsFallback: true
  };
  const excludes = exemptMatchPatterns();
  if (excludes.length) opts.excludeMatches = excludes;
  try {
    await browser.scripting.registerContentScripts([opts]);
  } catch (e) {
    console.error("chameleon: registerContentScripts failed", e);
  }
}

browser.storage.onChanged.addListener((changes, area) => {
  if (area !== "local") return;
  if (changes.settings) {
    settings = { ...defaults, ...changes.settings.newValue };
    paintBadge();
  }
  if (changes.masterSeed) {
    masterSeed = changes.masterSeed.newValue;
  }
});

browser.runtime.onInstalled.addListener(async () => {
  await load();
  await syncContentScripts();
  paintBadge();
});
browser.runtime.onStartup.addListener(async () => {
  await load();
  await syncContentScripts();
  paintBadge();
});

load().then(async () => {
  await syncContentScripts();
  paintBadge();
});
