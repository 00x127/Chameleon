<p align="center">
  <img src="icons/banner.png" alt="Chameleon" width="640">
</p>

<p align="center">
  Anti-fingerprinting extension for Firefox. Per-origin deterministic noise. Doesn't break sites.
</p>

<p align="center">
  <a href="https://github.com/00x127/Chameleon/releases"><img src="https://img.shields.io/badge/version-0.1.5-7aa2f7?style=flat-square" alt="version"></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-9ece6a?style=flat-square" alt="MIT"></a>
  <img src="https://img.shields.io/badge/firefox-128%2B-e0af68?style=flat-square" alt="Firefox 128+">
</p>

---

## What it is

Chameleon is an advanced Firefox extension that quietly blocks the fingerprinting surface modern websites use to track you. Canvas, WebGL, audio, fonts, MIDI, sensors, WebRTC, navigator quirks, the whole pile.

**The core trick:** Instead of randomising your fingerprint on every request (which actually makes you *more* unique, since no real browser does that), Chameleon picks a stable identity per origin. The same site sees the same fingerprint every time so nothing breaks. Two different sites see two different fingerprints so they can't link your visits together.

You can also rotate your master identity whenever you want with one click.


## How to use it

Once installed, Chameleon runs automatically. You don't have to do anything for the protection to apply. The defaults are tuned to be safe on every site.

### The toolbar popup

Click the chameleon icon to get the everyday controls.

- **Protection toggle.** Master on/off. Toggling reloads the current tab so the change is immediate. Settings stay saved when off, so flipping it back on restores everything.
- **Exempt this site.** When a specific site misbehaves with protection on (rare, mostly banks or aggressive anti-bot pages), flip this. The current eTLD+1 is added to the exemption list and the tab reloads with Chameleon disabled for that origin only.
- **Rotate identity.** Draws a fresh master seed. Every site you visit from this point on sees a brand new fingerprint. Good before a clean session for something sensitive.
- **Settings.** Opens the full options page.

### The options page

Right-click the icon, pick Manage Extension, then Options. Or click Settings in the popup.

- **Master toggle** at the top, mirrors the popup.
- **Browser identity.** Pick which OS/UA profile to present. Firefox on Linux is the default because it blends well.
- **Surfaces.** Individually toggle timer-precision rounding, timezone pinning to UTC, motion sensor blocking, and HTTP header rewriting.
- **Exempt origins.** One eTLD+1 per line. Use this when a site you trust keeps breaking. Lines starting with `#` are ignored.

### Verifying it works

Open these in two private windows and compare what you see. Same window visiting the same site twice should produce identical results. Different windows visiting the same site should produce different results.

- [browserleaks.com](https://browserleaks.com) (canvas, webgl, fonts, audio)
- [amiunique.org](https://amiunique.org)
- [coveryourtracks.eff.org](https://coveryourtracks.eff.org)
- [audiofingerprint.openwpm.com](https://audiofingerprint.openwpm.com)
- [creepjs](https://abrahamjuliot.github.io/creepjs) (the hardest test; expect some flags)

---

## What it blocks

Click any category to expand.

<details>
<summary><b>Visual fingerprinting</b> (canvas, WebGL, WebGPU)</summary><br>

Canvas 2D readback (toDataURL, toBlob, getImageData), WebGL and WebGL2 parameter spoofing, readPixels noising, WebGPU hidden entirely.

</details>

<details>
<summary><b>Audio fingerprinting</b> (AudioBuffer, AnalyserNode)</summary><br>

AudioBuffer, AnalyserNode, OfflineAudioContext. Sparse perturbation that's inaudible during playback but kills repeatability of the dynamics-compressor fingerprint.

</details>

<details>
<summary><b>Layout fingerprinting</b> (DOMRect, offset dims, screen)</summary><br>

TextMetrics, getBoundingClientRect, getClientRects, offsetWidth/Height, clientWidth/Height, scrollWidth/Height, screen dimensions, devicePixelRatio, outer dimensions.

</details>

<details>
<summary><b>Navigator identity</b> (UA, platform, hardware, languages)</summary><br>

userAgent, platform, oscpu, vendor, hardwareConcurrency, deviceMemory, languages, plugins, mimeTypes, maxTouchPoints, userAgentData all spoofed. The default "Auto" profile picks Linux, Windows, or macOS per origin so cross-site comparison cant match on OS. Same site always sees the same OS. You can pin a fixed profile in settings if you prefer.

</details>

<details>
<summary><b>Firefox quirks</b> (InstallTrigger, moz globals, CSS probes)</summary><br>

InstallTrigger, mozInnerScreenX, mozInnerScreenY, window.netscape, window.sidebar, navigator.taintEnabled, and `CSS.supports('-moz-...')` all hidden so feature-detection scripts can't easily confirm Firefox.

</details>

<details>
<summary><b>Hardware-leaking APIs</b> (Battery, Network, Storage, Bluetooth, USB)</summary><br>

NetworkInformation, Battery, StorageManager.estimate, MediaCapabilities, mediaDevices.enumerateDevices, SpeechSynthesis.getVoices, navigator.getGamepads, indexedDB.databases, Bluetooth, HID, Serial, USB, WakeLock, Ink, Clipboard surfaces.

</details>

<details>
<summary><b>Sensors</b> (motion, orientation, generic sensors)</summary><br>

Accelerometer, LinearAccelerationSensor, Gyroscope, AbsoluteOrientationSensor, RelativeOrientationSensor, Magnetometer, AmbientLightSensor, GravitySensor, devicemotion, deviceorientation, screen.orientation pinned, Touch radius/rotation/force zeroed.

</details>

<details>
<summary><b>Web MIDI</b></summary><br>

navigator.requestMIDIAccess rejected, MIDIAccess and related globals hidden.

</details>

<details>
<summary><b>WebXR and legacy WebVR</b></summary><br>

navigator.xr returns undefined. navigator.getVRDisplays resolves to an empty array. VRDisplay and the full XR global namespace (XRSystem, XRSession, XRFrame, etc) are hidden so headset presence and capabilities can't be probed.

</details>

<details>
<summary><b>PointerEvent properties</b> (stylus and tablet entropy)</summary><br>

pressure, tangentialPressure, tiltX, tiltY, twist, altitudeAngle, azimuthAngle all zeroed on non-pen pointers. Real pen input on tablets is preserved when pointerType is "pen". pointerId pinned to 1 so multi-touch sequences don't leak count.

</details>

<details>
<summary><b>Speech Recognition</b></summary><br>

SpeechRecognition, webkitSpeechRecognition, SpeechGrammar, SpeechGrammarList, and the associated event constructors all hidden. Detection scripts that probe for speech recognition capability find nothing.

</details>

<details>
<summary><b>Reporting Observer</b></summary><br>

ReportingObserver constructor stubbed to a no-op so sites can't watch the reporting queue for deprecation, intervention, or CSP reports as a tracking sidechannel.

</details>

<details>
<summary><b>Cookie Store API</b></summary><br>

window.cookieStore (the newer async cookie API) stubbed to return empty results so cross-site cookie enumeration through that surface fails.

</details>

<details>
<summary><b>Performance memory probes</b></summary><br>

performance.measureUserAgentSpecificMemory rejects with SecurityError so high-precision memory queries fail. performance.eventCounts returns an empty proxy so event-firing patterns can't be sampled.

</details>

<details>
<summary><b>Audio output latency</b></summary><br>

AudioContext.outputLatency and baseLatency pinned to common values so the audio hardware latency profile doesn't leak.

</details>

<details>
<summary><b>Notification API</b></summary><br>

Notification.permission pinned to "default" so the page can't infer whether you've previously granted notification access on this origin.

</details>

<details>
<summary><b>navigator.scheduling</b></summary><br>

The scheduling.isInputPending API (Chrome-only currently) returns undefined.

</details>

<details>
<summary><b>window.name</b></summary><br>

window.name is cleared on cross-origin navigations (detected via document.referrer comparison) so trackers can't persist identity through tab-level state. Same-origin navigations preserve it for legitimate session state.

</details>

<details>
<summary><b>Ad-blocker detection bypass</b></summary><br>

Sites that try to detect uBlock/AdBlock by checking for hidden ad-bait elements (`<div class="adsbox">` etc) get fooled. Bait elements report non-zero dimensions, common detection globals (`canRunAds`, `isAdBlockActive`) are pre-populated, so paywall nags don't trigger. Your actual ad blocker keeps doing its job at the network layer.

</details>

<details>
<summary><b>Font enumeration</b> (canvas + DOM API)</summary><br>

`FontFaceSet` enumeration (size, iteration, check, has, forEach, Symbol.iterator) locked to standard web safe set. `window.queryLocalFonts` and `navigator.fonts.query` (Local Font Access API) reject. Canvas `measureText` returns fallback-font widths for non-standard font families so JS-attribute font detection sees the same width regardless of what custom font was requested. Visual rendering of custom fonts is unchanged.

</details>

<details>
<summary><b>Permissions and media queries</b></summary><br>

Permissions API normalised. matchMedia for prefers-color-scheme, prefers-reduced-motion, forced-colors, pointer, hover, color-gamut, dynamic-range all return stable boring answers.

</details>

<details>
<summary><b>WebRTC</b> (ICE candidate suppression)</summary><br>

ICE host and srflx candidate suppression (your local network IP and STUN-reflected public IP don't leak). Relay candidates kept so video calls still work.

</details>

<details>
<summary><b>Timing</b> (sub-millisecond precision reduction)</summary><br>

performance.now, Date.now, event.timeStamp, requestAnimationFrame callback timestamps, PerformanceEntry, PerformanceTiming, DocumentTimeline all floored to 1ms.

</details>

<details>
<summary><b>Locale</b> (Intl APIs, timezone)</summary><br>

Intl.NumberFormat, Intl.Collator, Intl.RelativeTimeFormat, Intl.PluralRules, Intl.ListFormat, Intl.DisplayNames, Intl.Segmenter all report en-US, latin numbering, gregory calendar. Timezone pinned to UTC.

</details>

<details>
<summary><b>HTTP layer</b> (headers rewritten and stripped)</summary><br>

User-Agent rewritten, Accept-Language rewritten, full Sec-CH-UA family dropped, Accept-CH dropped, Save-Data dropped, Device-Memory dropped, NEL and Report-To response headers stripped, DNT and Sec-GPC always sent.

</details>

<details>
<summary><b>Workers</b></summary><br>

Worker constructor wraps remote scripts and re-injects the same hooks inside the worker scope. Cross-origin and module workers fall back to no shim.

</details>

<details>
<summary><b>Camouflage</b> (toString lies, error stack scrubbing)</summary><br>

Function.prototype.toString hooked so every override reports as `[native code]`. Error stack moz-extension:// paths scrubbed. PaymentRequest and the file pickers blocked.

</details>

---

## Will this slow my browser down?

No, not noticeably. You won't feel it during normal browsing.

The hot paths are canvas readback, audio data extraction, and getBoundingClientRect/measureText, all of which add a small constant-time noise step. Pages that read canvas constantly (one-off fingerprinting tests, some chart libraries) take a few ms longer per call. Real-world usage of these APIs on normal sites is rare and not in the rendering critical path.

The HTTP header rewriting is a hash lookup per request. Negligible.

The Worker wrap is the only thing with measurable cost: it does a synchronous XHR of the worker script body on construction so it can prepend hooks. For sites that spawn lots of workers (some web IDEs, heavy JS frameworks) this adds tens of milliseconds at startup. Cross-origin workers fail the sync XHR fast and fall through to native, so no penalty there.

If you ever notice slowdown on a specific site, exempt it. The protection still applies everywhere else.

---

## Configuration recipes

#### Maximum privacy, willing to break some sites
Settings: Linux profile, all switches on, no exemptions. Rotate identity weekly. Expect some sites to ask for extra verification (banks especially).

#### Daily-driver privacy
Settings: defaults. Exempt your bank, your video-conferencing app of choice, and anything that won't load. Done.

#### Casual privacy
Settings: defaults, turn off timezone pinning. The timezone-to-UTC trick is the one fingerprinters most reliably catch. Turning it off makes you more "normal looking" at the cost of leaking your region.

---

## Known limits

There's no such thing as perfect fingerprint defence from a browser extension. The honest list of what we can't fully fix:

- **Same-world detection.** The hooks live in the page's own JS realm so a paranoid fingerprinter can probe them. We hide the obvious tells (toString camouflage, native-ref capture before page scripts run) but creepjs will still flag some inconsistencies. True invisibility needs a content-process patch, not an extension.

- **Cross-origin worker scripts.** Synchronous XHR fails CORS so workers loaded from a CDN don't get hooks installed.

- **Timezone vs wall clock.** We pin getTimezoneOffset to UTC but `Date.getHours()` still returns local time, otherwise every clock widget on the web would display wrong. Detectable as an inconsistency.

- **First canvas read race.** The very first canvas read on a fresh page may use a hostname-only seed for ~50ms until the per-origin seed arrives from the background. Subsequent reads are stable.

- **TLS fingerprinting.** Extensions can't change how the browser does TLS handshakes, so JA3/JA4 fingerprints still leak. You need a network-level proxy or a different browser engine to fix that.

- **Math fingerprinting via Math.tan(-1e300) etc.** Firefox since 2022 uses fdlibm for these so the value is consistent across Firefox installs on the same architecture. Not great, but not random either.

- **TCP/IP fingerprinting.** Some sites identify your OS by analysing the shape of the TCP packets your machine sends (TTL, window size, MSS, TCP options ordering, etc, the p0f / JA3 / JA4 family). Those packets are constructed by your operating system's network stack, before the browser sees anything, so no browser extension can change them. If a fingerprinter says "this user is on Windows" via TCP/IP analysis even while you're spoofing the Linux UA, this is why. The only fixes are network-level: a VPN (the destination sees the VPN provider's TCP stack instead of yours), a SOCKS proxy, Tor, or running Firefox inside a VM whose OS doesn't match the host.
