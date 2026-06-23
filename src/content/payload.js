// chameleon main-world payload. document_start, page realm.
(() => {
  if (window.__cham_init__) return;
  Object.defineProperty(window, "__cham_init__", {
    value: true,
    configurable: false,
    enumerable: false,
    writable: false
  });

  let active = true;

  const _Math = Math;
  const _imul = Math.imul;
  const _Number = Number;
  const _Object = Object;
  const _defProp = Object.defineProperty;
  const _getDesc = Object.getOwnPropertyDescriptor;
  const _Reflect = Reflect;
  const _Proxy = Proxy;
  const _WeakMap = WeakMap;
  const _Map = Map;
  const _Set = Set;
  const _Array = Array;
  const _Uint8 = Uint8Array;
  const _Uint8Clamped = Uint8ClampedArray;
  const _Float32 = Float32Array;
  const _String = String;
  const _Error = Error;
  const _Date = Date;
  const _Promise = Promise;

  const nativeFnStr = Function.prototype.toString;
  const fakeSrc = new _WeakMap();

  function pose(fn, name) {
    fakeSrc.set(fn, "function " + (name || fn.name || "") + "() { [native code] }");
    return fn;
  }

  const toStringTrap = function toString() {
    if (fakeSrc.has(this)) return fakeSrc.get(this);
    return nativeFnStr.call(this);
  };
  pose(toStringTrap, "toString");
  _defProp(Function.prototype, "toString", {
    value: toStringTrap,
    writable: true,
    configurable: true
  });

  function cyrb128(str) {
    let h1 = 1779033703, h2 = 3144134277, h3 = 1013904242, h4 = 2773480762;
    for (let i = 0, k; i < str.length; i++) {
      k = str.charCodeAt(i);
      h1 = h2 ^ _imul(h1 ^ k, 597399067);
      h2 = h3 ^ _imul(h2 ^ k, 2869860233);
      h3 = h4 ^ _imul(h3 ^ k, 951274213);
      h4 = h1 ^ _imul(h4 ^ k, 2716044179);
    }
    h1 = _imul(h3 ^ (h1 >>> 18), 597399067);
    h2 = _imul(h4 ^ (h2 >>> 22), 2869860233);
    h3 = _imul(h1 ^ (h3 >>> 17), 951274213);
    h4 = _imul(h2 ^ (h4 >>> 19), 2716044179);
    return [(h1 ^ h2 ^ h3 ^ h4) >>> 0, (h2 ^ h1) >>> 0, (h3 ^ h1) >>> 0, (h4 ^ h1) >>> 0];
  }

  function makeRng(seed) {
    const s = cyrb128(seed);
    let a = s[0], b = s[1], c = s[2], d = s[3];
    return function () {
      a |= 0; b |= 0; c |= 0; d |= 0;
      const t = (((a + b) | 0) + d) | 0;
      d = (d + 1) | 0;
      a = b ^ (b >>> 9);
      b = (c + (c << 3)) | 0;
      c = (c << 21) | (c >>> 11);
      c = (c + t) | 0;
      return (t >>> 0) / 4294967296;
    };
  }

  let baseSeed = (location.hostname || "blank") + "|chameleon";
  let seedWord = 0;

  function refreshSeedWord() {
    let s = 2166136261 >>> 0;
    for (let i = 0; i < baseSeed.length; i++) {
      s ^= baseSeed.charCodeAt(i);
      s = _imul(s, 16777619) >>> 0;
    }
    seedWord = s | 0;
  }
  refreshSeedWord();

  let flags = {
    spoofTimezone: true,
    blockSensors: true,
    reduceTimerPrecision: true,
    spoofUserAgent: true
  };

  let profile = {
    ua: navigator.userAgent,
    platform: "Linux x86_64",
    oscpu: "Linux x86_64",
    vendor: "",
    appVersion: navigator.appVersion,
    acceptLang: "en-US,en;q=0.5"
  };

  document.addEventListener("__cham_cfg__", (e) => {
    try {
      const cfg = JSON.parse(e.detail);
      if (!cfg) return;
      active = !!cfg.active;
      if (!cfg.active) return;
      if (cfg.seed) {
        baseSeed = cfg.seed;
        refreshSeedWord();
      }
      if (cfg.flags) flags = _Object.assign({}, flags, cfg.flags);
      if (cfg.profile) profile = _Object.assign({}, profile, cfg.profile);
    } catch (_) {}
  });

  function noiseBit(x, y, c) {
    let h = (x * 73856093) ^ (y * 19349663) ^ (c * 83492791) ^ seedWord;
    h = _imul(h ^ (h >>> 13), 1540483477);
    h ^= h >>> 15;
    return ((h >>> 24) & 1) & (((h >>> 17) & 7) === 0 ? 1 : 0);
  }

  function paintNoise(imageData, ox, oy) {
    if (!active) return;
    const d = imageData.data;
    const w = imageData.width;
    const h = imageData.height;
    for (let y = 0; y < h; y++) {
      const row = y * w;
      const ay = oy + y;
      for (let x = 0; x < w; x++) {
        const i = (row + x) << 2;
        if (d[i + 3] === 0) continue;
        const ax = ox + x;
        d[i] ^= noiseBit(ax, ay, 0);
        d[i + 1] ^= noiseBit(ax, ay, 1);
        d[i + 2] ^= noiseBit(ax, ay, 2);
      }
    }
  }

  const HCE = HTMLCanvasElement;
  const OSC = window.OffscreenCanvas;
  const C2D = CanvasRenderingContext2D;
  const OSC2D = window.OffscreenCanvasRenderingContext2D;
  const ID = window.ImageData;

  const nativeToDataURL = HCE.prototype.toDataURL;
  const nativeToBlob = HCE.prototype.toBlob;
  const nativeGetImageData = C2D.prototype.getImageData;
  const nativeMeasureText = C2D.prototype.measureText;
  const nativeIsPointInPath = C2D.prototype.isPointInPath;
  const nativeIsPointInStroke = C2D.prototype.isPointInStroke;
  const nativeOSCConvert = OSC ? OSC.prototype.convertToBlob : null;
  const nativeOSCGetData = OSC2D ? OSC2D.prototype.getImageData : null;

  function snapshotForReadout(canvas) {
    const w = canvas.width | 0;
    const h = canvas.height | 0;
    if (!w || !h) return canvas;
    let copy;
    try {
      copy = document.createElement("canvas");
      copy.width = w;
      copy.height = h;
      const cx = copy.getContext("2d");
      cx.drawImage(canvas, 0, 0);
      const id = nativeGetImageData.call(cx, 0, 0, w, h);
      paintNoise(id, 0, 0);
      cx.putImageData(id, 0, 0);
    } catch (_) {
      return canvas;
    }
    return copy;
  }

  pose(_defProp(HCE.prototype, "toDataURL", {
    value: function (...args) {
      const c = snapshotForReadout(this);
      return nativeToDataURL.apply(c, args);
    },
    writable: true,
    configurable: true
  }) && HCE.prototype.toDataURL, "toDataURL");

  pose(_defProp(HCE.prototype, "toBlob", {
    value: function (cb, ...rest) {
      const c = snapshotForReadout(this);
      return nativeToBlob.call(c, cb, ...rest);
    },
    writable: true,
    configurable: true
  }) && HCE.prototype.toBlob, "toBlob");

  pose(_defProp(C2D.prototype, "getImageData", {
    value: function (sx, sy, sw, sh, ...rest) {
      const result = nativeGetImageData.call(this, sx, sy, sw, sh, ...rest);
      paintNoise(result, sx | 0, sy | 0);
      return result;
    },
    writable: true,
    configurable: true
  }) && C2D.prototype.getImageData, "getImageData");

  if (OSC && nativeOSCConvert) {
    pose(_defProp(OSC.prototype, "convertToBlob", {
      value: function (...args) {
        try {
          const w = this.width, h = this.height;
          const tmp = new OSC(w, h);
          const cx = tmp.getContext("2d");
          cx.drawImage(this, 0, 0);
          const id = nativeOSCGetData.call(cx, 0, 0, w, h);
          paintNoise(id, 0, 0);
          cx.putImageData(id, 0, 0);
          return nativeOSCConvert.apply(tmp, args);
        } catch (_) {
          return nativeOSCConvert.apply(this, args);
        }
      },
      writable: true,
      configurable: true
    }) && OSC.prototype.convertToBlob, "convertToBlob");
  }

  if (OSC2D && nativeOSCGetData) {
    pose(_defProp(OSC2D.prototype, "getImageData", {
      value: function (sx, sy, sw, sh, ...rest) {
        const r = nativeOSCGetData.call(this, sx, sy, sw, sh, ...rest);
        paintNoise(r, sx | 0, sy | 0);
        return r;
      },
      writable: true,
      configurable: true
    }) && OSC2D.prototype.getImageData, "getImageData");
  }

  function jitter(value, magnitude, salt) {
    if (!active) return value;
    let h = (((value * 1e6) | 0) ^ seedWord ^ (salt | 0)) >>> 0;
    h = _imul(h ^ (h >>> 16), 2246822507) >>> 0;
    h = _imul(h ^ (h >>> 13), 3266489909) >>> 0;
    h ^= h >>> 16;
    const sign = (h & 1) ? 1 : -1;
    const frac = ((h >>> 1) % 1024) / 1024;
    return value + sign * magnitude * frac;
  }

  const STD_FONTS = ["serif", "sans-serif", "monospace", "cursive", "fantasy",
    "system-ui", "ui-serif", "ui-sans-serif", "ui-monospace",
    "arial", "helvetica", "times", "times new roman", "courier",
    "courier new", "verdana", "georgia", "tahoma", "trebuchet ms",
    "comic sans ms", "impact", "lucida console", "palatino", "garamond"];

  function fontHasCustom(s) {
    const fontStr = String(s || "").toLowerCase();
    const family = fontStr.split(",").map(p => p.trim().replace(/['"]/g, ""));
    for (const f of family) {
      const lastTok = f.split(/\s+/).slice(-1)[0];
      if (!lastTok) continue;
      let known = false;
      for (const std of STD_FONTS) {
        if (lastTok === std || lastTok.indexOf(std) !== -1) { known = true; break; }
      }
      if (!known) return true;
    }
    return false;
  }

  // measureText swaps to fallback when font is custom. fillText keeps the real font.
  const fontDesc = _getDesc(C2D.prototype, "font");
  const ctxFontMeta = new _WeakMap();
  if (fontDesc && fontDesc.set && fontDesc.get) {
    const origSet = fontDesc.set;
    const origGet = fontDesc.get;
    _defProp(C2D.prototype, "font", {
      set: pose(function (value) {
        try {
          const v = String(value);
          ctxFontMeta.set(this, { original: v, hasCustom: fontHasCustom(v) });
        } catch (_) {}
        return origSet.call(this, value);
      }, "set font"),
      get: pose(function () { return origGet.call(this); }, "get font"),
      configurable: true
    });
  }

  pose(_defProp(C2D.prototype, "measureText", {
    value: function (text) {
      let m;
      const meta = ctxFontMeta.get(this);
      if (meta && meta.hasCustom && fontDesc && fontDesc.set && fontDesc.get) {
        const origFont = fontDesc.get.call(this);
        const size = (origFont.match(/\d+(\.\d+)?(px|pt|em|rem|%)/) || ["12px"])[0];
        try {
          fontDesc.set.call(this, size + " sans-serif");
          m = nativeMeasureText.call(this, text);
        } finally {
          try { fontDesc.set.call(this, origFont); } catch (_) {}
        }
      } else {
        m = nativeMeasureText.call(this, text);
      }
      const salt = 0;
      const wrapped = {};
      const keys = ["width", "actualBoundingBoxLeft", "actualBoundingBoxRight",
        "actualBoundingBoxAscent", "actualBoundingBoxDescent",
        "fontBoundingBoxAscent", "fontBoundingBoxDescent",
        "emHeightAscent", "emHeightDescent",
        "hangingBaseline", "alphabeticBaseline", "ideographicBaseline"];
      for (const k of keys) {
        try {
          const v = m[k];
          if (typeof v === "number") {
            wrapped[k] = jitter(v, 0.0004, k.length);
          }
        } catch (_) {}
      }
      return new _Proxy(m, {
        get(t, p) {
          if (p in wrapped) return wrapped[p];
          return _Reflect.get(t, p);
        }
      });
    },
    writable: true,
    configurable: true
  }) && C2D.prototype.measureText, "measureText");

  // TODO renderer string should come from UA profile
  const GL = window.WebGLRenderingContext;
  const GL2 = window.WebGL2RenderingContext;

  const glVendor = "Mozilla";
  const glRenderer = "Mozilla";
  const glUnmaskedVendor = "Google Inc.";
  const glUnmaskedRenderer = "ANGLE (Intel, Mesa Intel(R) UHD Graphics, OpenGL 4.6)";

  const fixedParams = new _Map([
    [0x1F00, "WebKit"],
    [0x1F01, "WebKit WebGL"],
    [0x9245, glUnmaskedVendor],
    [0x9246, glUnmaskedRenderer]
  ]);

  function patchGL(proto) {
    if (!proto) return;
    const nGetParam = proto.getParameter;
    const nGetExt = proto.getExtension;
    const nGetSupported = proto.getSupportedExtensions;
    const nReadPixels = proto.readPixels;
    const nGetShaderPrec = proto.getShaderPrecisionFormat;

    pose(_defProp(proto, "getParameter", {
      value: function (p) {
        if (fixedParams.has(p)) return fixedParams.get(p);
        return nGetParam.call(this, p);
      },
      writable: true,
      configurable: true
    }) && proto.getParameter, "getParameter");

    pose(_defProp(proto, "getExtension", {
      value: function (name) {
        if (name === "WEBGL_debug_renderer_info") {
          return {
            UNMASKED_VENDOR_WEBGL: 0x9245,
            UNMASKED_RENDERER_WEBGL: 0x9246
          };
        }
        return nGetExt.call(this, name);
      },
      writable: true,
      configurable: true
    }) && proto.getExtension, "getExtension");

    pose(_defProp(proto, "readPixels", {
      value: function (x, y, w, h, format, type, pixels, ...rest) {
        const r = nReadPixels.call(this, x, y, w, h, format, type, pixels, ...rest);
        if (pixels && pixels.length) {
          const len = pixels.length;
          for (let i = 0; i < len; i += 4) {
            const px = (i >> 2) % (w || 1);
            const py = ((i >> 2) / (w || 1)) | 0;
            pixels[i] ^= noiseBit(x + px, y + py, 0);
            pixels[i + 1] ^= noiseBit(x + px, y + py, 1);
            pixels[i + 2] ^= noiseBit(x + px, y + py, 2);
          }
        }
        return r;
      },
      writable: true,
      configurable: true
    }) && proto.readPixels, "readPixels");

    pose(_defProp(proto, "getShaderPrecisionFormat", {
      value: function (shaderType, precisionType) {
        const r = nGetShaderPrec.call(this, shaderType, precisionType);
        if (!r) return r;
        return _Object.freeze({
          rangeMin: r.rangeMin,
          rangeMax: r.rangeMax,
          precision: r.precision
        });
      },
      writable: true,
      configurable: true
    }) && proto.getShaderPrecisionFormat, "getShaderPrecisionFormat");
  }

  if (GL) patchGL(GL.prototype);
  if (GL2) patchGL(GL2.prototype);

  const AB = window.AudioBuffer;
  const ANode = window.AnalyserNode;
  const OAC = window.OfflineAudioContext;

  function nudgeFloat(arr) {
    if (!active) return;
    const len = arr.length;
    for (let i = 0; i < len; i++) {
      const h = (_imul(i ^ seedWord, 374761393) ^ (i << 5)) >>> 0;
      if ((h & 0x3f) === 0) {
        const delta = ((h >>> 8) & 0xff) / 2147483648;
        arr[i] = arr[i] + delta;
      }
    }
  }

  function nudgeByte(arr) {
    if (!active) return;
    const len = arr.length;
    for (let i = 0; i < len; i++) {
      const h = (_imul(i ^ seedWord, 374761393) ^ (i << 5)) >>> 0;
      if ((h & 0x1f) === 0) {
        arr[i] = (arr[i] + ((h & 3) - 1)) & 0xff;
      }
    }
  }

  if (OAC) {
    const nStart = OAC.prototype.startRendering;
    pose(_defProp(OAC.prototype, "startRendering", {
      value: function () {
        const p = nStart.call(this);
        return p.then(function (buffer) {
          try {
            if (active && buffer && typeof buffer.getChannelData === "function") {
              for (let ch = 0; ch < buffer.numberOfChannels; ch++) {
                nudgeFloat(buffer.getChannelData(ch));
              }
            }
          } catch (_) {}
          return buffer;
        });
      },
      writable: true,
      configurable: true
    }) && OAC.prototype.startRendering, "startRendering");
  }

  if (ANode) {
    const nFloatFreq = ANode.prototype.getFloatFrequencyData;
    const nByteFreq = ANode.prototype.getByteFrequencyData;
    const nFloatTime = ANode.prototype.getFloatTimeDomainData;
    const nByteTime = ANode.prototype.getByteTimeDomainData;

    pose(_defProp(ANode.prototype, "getFloatFrequencyData", {
      value: function (arr) {
        const r = nFloatFreq.call(this, arr);
        nudgeFloat(arr);
        return r;
      },
      writable: true,
      configurable: true
    }) && ANode.prototype.getFloatFrequencyData, "getFloatFrequencyData");

    pose(_defProp(ANode.prototype, "getByteFrequencyData", {
      value: function (arr) {
        const r = nByteFreq.call(this, arr);
        nudgeByte(arr);
        return r;
      },
      writable: true,
      configurable: true
    }) && ANode.prototype.getByteFrequencyData, "getByteFrequencyData");

    pose(_defProp(ANode.prototype, "getFloatTimeDomainData", {
      value: function (arr) {
        const r = nFloatTime.call(this, arr);
        nudgeFloat(arr);
        return r;
      },
      writable: true,
      configurable: true
    }) && ANode.prototype.getFloatTimeDomainData, "getFloatTimeDomainData");

    pose(_defProp(ANode.prototype, "getByteTimeDomainData", {
      value: function (arr) {
        const r = nByteTime.call(this, arr);
        nudgeByte(arr);
        return r;
      },
      writable: true,
      configurable: true
    }) && ANode.prototype.getByteTimeDomainData, "getByteTimeDomainData");
  }

  function spoofNavigator() {
    const N = Navigator.prototype;
    const set = (prop, val) => {
      try {
        _defProp(N, prop, {
          get: pose(function () { return val; }, "get " + prop),
          set: function () {},
          enumerable: true,
          configurable: true
        });
      } catch (_) {}
    };
    const setLive = (prop, getter) => {
      try {
        _defProp(N, prop, {
          get: pose(getter, "get " + prop),
          set: function () {},
          enumerable: true,
          configurable: true
        });
      } catch (_) {}
    };

    if (flags.spoofUserAgent) {
      set("userAgent", profile.ua);
      set("appVersion", profile.appVersion || profile.ua.replace(/^Mozilla\//, ""));
      set("platform", profile.platform);
      set("oscpu", profile.oscpu);
      set("vendor", profile.vendor || "");
      set("vendorSub", "");
      set("productSub", "20100101");
      set("buildID", "20181001000000");
    }

    const coresOpts = [4, 4, 6, 8, 8, 8, 8, 12, 16];
    const memOpts = [4, 4, 8, 8, 8, 8, 8, 16];
    setLive("hardwareConcurrency", function () { return coresOpts[seedWord % coresOpts.length]; });
    setLive("deviceMemory", function () { return memOpts[seedWord % memOpts.length]; });

    set("maxTouchPoints", 0);
    set("doNotTrack", "1");
    set("globalPrivacyControl", true);
    set("webdriver", false);
    set("pdfViewerEnabled", true);
    set("cookieEnabled", true);
    set("onLine", true);

    set("language", "en-US");
    set("languages", _Object.freeze(["en-US", "en"]));

    set("plugins", _Object.freeze([]));
    set("mimeTypes", _Object.freeze([]));

    try {
      if ("userAgentData" in N) {
        _defProp(N, "userAgentData", {
          get: pose(function () { return undefined; }, "get userAgentData"),
          set: function () {},
          configurable: true
        });
      }
    } catch (_) {}
  }
  spoofNavigator();

  try {
    if (window.name) {
      let crossOrigin = true;
      try {
        const ref = document.referrer;
        if (ref) {
          const refOrigin = new URL(ref).origin;
          if (refOrigin === location.origin) crossOrigin = false;
        }
      } catch (_) {}
      if (crossOrigin) {
        try { window.name = ""; } catch (_) {}
      }
    }
  } catch (_) {}

  function spoofScreen() {
    const S = Screen.prototype;
    const set = (prop, val) => {
      try {
        _defProp(S, prop, {
          get: pose(function () { return val; }, "get " + prop),
          set: function () {},
          enumerable: true,
          configurable: true
        });
      } catch (_) {}
    };
    const setLive = (prop, getter) => {
      try {
        _defProp(S, prop, {
          get: pose(getter, "get " + prop),
          set: function () {},
          enumerable: true,
          configurable: true
        });
      } catch (_) {}
    };
    const wGet = function () { return _Math.max(800, (window.innerWidth || 1280) + _Math.round(jitter(0, 15, 0x53577a))); };
    const hGet = function () { return _Math.max(600, (window.innerHeight || 720) + _Math.round(jitter(0, 15, 0x53687a))); };
    setLive("width", wGet);
    setLive("height", hGet);
    setLive("availWidth", wGet);
    setLive("availHeight", hGet);
    set("colorDepth", 24);
    set("pixelDepth", 24);
    set("availLeft", 0);
    set("availTop", 0);
    set("isExtended", false);
  }
  spoofScreen();

  try {
    const dprOpts = [1, 1, 1, 1, 1.25, 1.5, 2];
    _defProp(window, "devicePixelRatio", {
      get: pose(function () { return dprOpts[seedWord % dprOpts.length]; }, "get devicePixelRatio"),
      set: function () {},
      configurable: true
    });
  } catch (_) {}

  try {
    _defProp(window, "outerWidth", {
      get: pose(function () { return window.innerWidth; }, "get outerWidth"),
      set: function () {},
      configurable: true
    });
    _defProp(window, "outerHeight", {
      get: pose(function () { return window.innerHeight; }, "get outerHeight"),
      set: function () {},
      configurable: true
    });
    _defProp(window, "screenX", {
      get: pose(function () { return 0; }, "get screenX"),
      set: function () {},
      configurable: true
    });
    _defProp(window, "screenY", {
      get: pose(function () { return 0; }, "get screenY"),
      set: function () {},
      configurable: true
    });
    _defProp(window, "screenLeft", {
      get: pose(function () { return 0; }, "get screenLeft"),
      set: function () {},
      configurable: true
    });
    _defProp(window, "screenTop", {
      get: pose(function () { return 0; }, "get screenTop"),
      set: function () {},
      configurable: true
    });
  } catch (_) {}

  const E = Element;
  const Rng = window.Range;
  const nRectFn = E.prototype.getBoundingClientRect;
  const nRectsFn = E.prototype.getClientRects;
  const nRangeRect = Rng ? Rng.prototype.getBoundingClientRect : null;
  const nRangeRects = Rng ? Rng.prototype.getClientRects : null;

  function dressRect(r, salt) {
    if (!r) return r;
    const x = jitter(r.x, 0.0003, salt);
    const y = jitter(r.y, 0.0003, salt + 1);
    const w = jitter(r.width, 0.0003, salt + 2);
    const h = jitter(r.height, 0.0003, salt + 3);
    return DOMRect ? new DOMRect(x, y, w, h) : {
      x, y, width: w, height: h,
      top: y, left: x, right: x + w, bottom: y + h
    };
  }

  pose(_defProp(E.prototype, "getBoundingClientRect", {
    value: function () {
      const r = nRectFn.call(this);
      let salt = 0;
      try { salt = (this.tagName || "").length; } catch (_) {}
      return dressRect(r, salt);
    },
    writable: true,
    configurable: true
  }) && E.prototype.getBoundingClientRect, "getBoundingClientRect");

  pose(_defProp(E.prototype, "getClientRects", {
    value: function () {
      const list = nRectsFn.call(this);
      const out = [];
      for (let i = 0; i < list.length; i++) {
        out.push(dressRect(list[i], i));
      }
      out.item = function (n) { return out[n] || null; };
      return out;
    },
    writable: true,
    configurable: true
  }) && E.prototype.getClientRects, "getClientRects");

  if (Rng && nRangeRect) {
    pose(_defProp(Rng.prototype, "getBoundingClientRect", {
      value: function () {
        const r = nRangeRect.call(this);
        return dressRect(r, 7);
      },
      writable: true,
      configurable: true
    }) && Rng.prototype.getBoundingClientRect, "getBoundingClientRect");
  }
  if (Rng && nRangeRects) {
    pose(_defProp(Rng.prototype, "getClientRects", {
      value: function () {
        const list = nRangeRects.call(this);
        const out = [];
        for (let i = 0; i < list.length; i++) out.push(dressRect(list[i], i + 11));
        out.item = function (n) { return out[n] || null; };
        return out;
      },
      writable: true,
      configurable: true
    }) && Rng.prototype.getClientRects, "getClientRects");
  }

  // network blocking still happens at the request layer, this hides the fact
  const adBaitPatterns = [
    "adsbox", "adsbygoogle", "ad-banner", "ad-slot", "ad-zone",
    "ad-container", "ad-wrapper", "banner_ad", "banner-ad",
    "advertisement", "advert", "googlead", "google_ads",
    "pub_300x250", "text-ad", "textad", "sponsored-ad"
  ];

  function isAdBait(el) {
    if (!el) return false;
    try {
      const cn = el.className && typeof el.className === "string"
        ? el.className.toLowerCase()
        : (el.className && el.className.baseVal ? el.className.baseVal.toLowerCase() : "");
      const id = String(el.id || "").toLowerCase();
      for (const p of adBaitPatterns) {
        if (cn.indexOf(p) !== -1 || id.indexOf(p) !== -1) return true;
      }
    } catch (_) {}
    return false;
  }

  const HE = HTMLElement;
  const elemDims = ["offsetWidth", "offsetHeight", "clientWidth", "clientHeight"];
  for (const dim of elemDims) {
    try {
      const desc = _getDesc(HE.prototype, dim);
      if (!desc || !desc.get) continue;
      const orig = desc.get;
      const isWidth = dim.indexOf("Width") !== -1;
      _defProp(HE.prototype, dim, {
        get: pose(function () {
          const v = orig.call(this);
          if (v === 0 && isAdBait(this)) {
            return isWidth ? 300 : 250;
          }
          if (typeof v !== "number" || v === 0) return v;
          const j = jitter(v, 0.0002, dim.length);
          return _Math.round(j);
        }, "get " + dim),
        set: desc.set || function () {},
        enumerable: desc.enumerable,
        configurable: true
      });
    } catch (_) {}
  }

  try {
    if (!("canRunAds" in window)) {
      _defProp(window, "canRunAds", { value: true, writable: true, configurable: true });
    }
    if (!("isAdBlockActive" in window)) {
      _defProp(window, "isAdBlockActive", { value: false, writable: true, configurable: true });
    }
  } catch (_) {}

  if (flags.reduceTimerPrecision) {
    const grain = 1;
    const nPerfNow = performance.now;
    pose(_defProp(performance.constructor.prototype, "now", {
      value: function () {
        const t = nPerfNow.call(this);
        return _Math.floor(t / grain) * grain;
      },
      writable: true,
      configurable: true
    }) && performance.constructor.prototype.now, "now");

    const evDesc = _getDesc(Event.prototype, "timeStamp");
    if (evDesc && evDesc.get) {
      const origTs = evDesc.get;
      _defProp(Event.prototype, "timeStamp", {
        get: pose(function () {
          const t = origTs.call(this);
          return _Math.floor(t / grain) * grain;
        }, "get timeStamp"),
        configurable: true
      });
    }
  }

  // dont remap getHours/getMinutes or clocks display wrong
  if (flags.spoofTimezone) {
    const utcStr = "Coordinated Universal Time";
    const nDateGet = _Date.prototype.getTimezoneOffset;
    pose(_defProp(_Date.prototype, "getTimezoneOffset", {
      value: function () { return 0; },
      writable: true,
      configurable: true
    }) && _Date.prototype.getTimezoneOffset, "getTimezoneOffset");

    const nDateToString = _Date.prototype.toString;
    pose(_defProp(_Date.prototype, "toString", {
      value: function () {
        const s = nDateToString.call(this);
        return s.replace(/GMT[+\-]\d{4}.*$/, "GMT+0000 (" + utcStr + ")");
      },
      writable: true,
      configurable: true
    }) && _Date.prototype.toString, "toString");

    const nDateToTimeString = _Date.prototype.toTimeString;
    pose(_defProp(_Date.prototype, "toTimeString", {
      value: function () {
        const s = nDateToTimeString.call(this);
        return s.replace(/GMT[+\-]\d{4}.*$/, "GMT+0000 (" + utcStr + ")");
      },
      writable: true,
      configurable: true
    }) && _Date.prototype.toTimeString, "toTimeString");

    const ResolvedTZ = Intl && Intl.DateTimeFormat ? Intl.DateTimeFormat.prototype.resolvedOptions : null;
    if (ResolvedTZ) {
      pose(_defProp(Intl.DateTimeFormat.prototype, "resolvedOptions", {
        value: function () {
          const r = ResolvedTZ.call(this);
          r.timeZone = "UTC";
          return r;
        },
        writable: true,
        configurable: true
      }) && Intl.DateTimeFormat.prototype.resolvedOptions, "resolvedOptions");
    }
  }

  const nMatchMedia = window.matchMedia;
  if (nMatchMedia) {
    let realColorScheme = "light";
    let realReducedMotion = "no-preference";
    let realReducedTransparency = "no-preference";
    let realContrast = "no-preference";
    let realForcedColors = "none";
    try {
      if (nMatchMedia.call(window, "(prefers-color-scheme: dark)").matches) realColorScheme = "dark";
      if (nMatchMedia.call(window, "(prefers-reduced-motion: reduce)").matches) realReducedMotion = "reduce";
      if (nMatchMedia.call(window, "(prefers-reduced-transparency: reduce)").matches) realReducedTransparency = "reduce";
      if (nMatchMedia.call(window, "(prefers-contrast: more)").matches) realContrast = "more";
      else if (nMatchMedia.call(window, "(prefers-contrast: less)").matches) realContrast = "less";
      if (nMatchMedia.call(window, "(forced-colors: active)").matches) realForcedColors = "active";
    } catch (_) {}

    const flatAnswers = {
      "prefers-color-scheme": realColorScheme,
      "prefers-reduced-motion": realReducedMotion,
      "prefers-reduced-transparency": realReducedTransparency,
      "prefers-contrast": realContrast,
      "prefers-reduced-data": "no-preference",
      "forced-colors": realForcedColors,
      "inverted-colors": "none",
      "any-hover": "hover",
      "any-pointer": "fine",
      "hover": "hover",
      "pointer": "fine",
      "color-gamut": "srgb",
      "dynamic-range": "standard",
      "video-dynamic-range": "standard",
      "scripting": "enabled",
      "update": "fast"
    };

    pose(_defProp(window, "matchMedia", {
      value: function (q) {
        const ql = nMatchMedia.call(this, q);
        const trimmed = (q || "").toLowerCase();
        for (const key in flatAnswers) {
          const want = flatAnswers[key];
          if (trimmed.indexOf(key) !== -1) {
            const match = trimmed.indexOf(want) !== -1;
            try {
              _defProp(ql, "matches", {
                get: pose(function () { return match; }, "get matches"),
                configurable: true
              });
            } catch (_) {}
          }
        }
        return ql;
      },
      writable: true,
      configurable: true
    }) && window.matchMedia, "matchMedia");
  }

  if (navigator.getBattery) {
    const fakeBat = _Object.freeze({
      charging: true,
      chargingTime: 0,
      dischargingTime: Infinity,
      level: 1,
      addEventListener: function () {},
      removeEventListener: function () {},
      dispatchEvent: function () { return true; },
      onchargingchange: null,
      onchargingtimechange: null,
      ondischargingtimechange: null,
      onlevelchange: null
    });
    pose(_defProp(Navigator.prototype, "getBattery", {
      value: function () { return _Promise.resolve(fakeBat); },
      writable: true,
      configurable: true
    }) && Navigator.prototype.getBattery, "getBattery");
  }

  try {
    if ("connection" in Navigator.prototype || navigator.connection) {
      const fakeConn = _Object.freeze({
        effectiveType: "4g",
        type: "wifi",
        downlink: 10,
        downlinkMax: Infinity,
        rtt: 50,
        saveData: false,
        addEventListener: function () {},
        removeEventListener: function () {},
        dispatchEvent: function () { return true; },
        onchange: null
      });
      _defProp(Navigator.prototype, "connection", {
        get: pose(function () { return fakeConn; }, "get connection"),
        configurable: true
      });
      _defProp(Navigator.prototype, "mozConnection", {
        get: pose(function () { return fakeConn; }, "get mozConnection"),
        configurable: true
      });
      _defProp(Navigator.prototype, "webkitConnection", {
        get: pose(function () { return fakeConn; }, "get webkitConnection"),
        configurable: true
      });
    }
  } catch (_) {}

  if (window.speechSynthesis) {
    const fixedVoices = [];
    const nGetVoices = window.speechSynthesis.getVoices;
    pose(_defProp(SpeechSynthesis.prototype, "getVoices", {
      value: function () { return fixedVoices; },
      writable: true,
      configurable: true
    }) && SpeechSynthesis.prototype.getVoices, "getVoices");
  }

  if (navigator.mediaDevices) {
    const MD = MediaDevices.prototype;
    const nEnum = MD.enumerateDevices;
    pose(_defProp(MD, "enumerateDevices", {
      value: function () {
        return _Promise.resolve([]);
      },
      writable: true,
      configurable: true
    }) && MD.enumerateDevices, "enumerateDevices");

    if (MD.getSupportedConstraints) {
      pose(_defProp(MD, "getSupportedConstraints", {
        value: function () {
          return _Object.freeze({
            aspectRatio: true,
            deviceId: true,
            echoCancellation: true,
            facingMode: true,
            frameRate: true,
            groupId: true,
            height: true,
            sampleRate: true,
            sampleSize: true,
            width: true
          });
        },
        writable: true,
        configurable: true
      }) && MD.getSupportedConstraints, "getSupportedConstraints");
    }
  }

  if (window.MediaCapabilities) {
    const MCP = MediaCapabilities.prototype;
    const stockResp = function () {
      return _Promise.resolve({
        supported: true,
        smooth: true,
        powerEfficient: false,
        configuration: {}
      });
    };
    pose(_defProp(MCP, "decodingInfo", {
      value: stockResp,
      writable: true,
      configurable: true
    }) && MCP.decodingInfo, "decodingInfo");
    pose(_defProp(MCP, "encodingInfo", {
      value: stockResp,
      writable: true,
      configurable: true
    }) && MCP.encodingInfo, "encodingInfo");
  }

  if (navigator.storage && navigator.storage.estimate) {
    pose(_defProp(StorageManager.prototype, "estimate", {
      value: function () {
        return _Promise.resolve({
          quota: 1073741824,
          usage: 0,
          usageDetails: {}
        });
      },
      writable: true,
      configurable: true
    }) && StorageManager.prototype.estimate, "estimate");
  }

  // keep relay candidates so zoom/meet/discord still work via TURN
  if (window.RTCPeerConnection) {
    const nPC = window.RTCPeerConnection;
    const scrubSdp = (sdp) => {
      if (!sdp || typeof sdp !== "string") return sdp;
      return sdp.split("\n").filter(line => {
        if (line.indexOf("a=candidate") === 0) {
          if (line.indexOf(" host ") !== -1) return false;
          if (line.indexOf(" srflx ") !== -1) return false;
        }
        return true;
      }).join("\n");
    };

    class FilteredPC extends nPC {
      constructor(config, ...rest) {
        super(config, ...rest);
        const realAdd = this.addEventListener.bind(this);
        const dropEvt = (ev) => {
          if (!ev || !ev.candidate) return false;
          const c = ev.candidate.candidate || "";
          if (c.indexOf(" host ") !== -1) return true;
          if (c.indexOf(" srflx ") !== -1) return true;
          return false;
        };
        const wrappedListeners = new _WeakMap();
        this.addEventListener = function (type, listener, opts) {
          if (type === "icecandidate" && typeof listener === "function") {
            const wrapped = function (e) { if (!dropEvt(e)) listener.call(this, e); };
            wrappedListeners.set(listener, wrapped);
            return realAdd(type, wrapped, opts);
          }
          return realAdd(type, listener, opts);
        };
        const realSetOn = _getDesc(nPC.prototype, "onicecandidate");
        if (realSetOn && realSetOn.set) {
          _defProp(this, "onicecandidate", {
            set: function (fn) {
              if (typeof fn !== "function") return realSetOn.set.call(this, fn);
              const w = function (e) { if (!dropEvt(e)) fn.call(this, e); };
              return realSetOn.set.call(this, w);
            },
            get: realSetOn.get,
            configurable: true
          });
        }
      }

      async createOffer(...args) {
        const r = await super.createOffer(...args);
        if (r && r.sdp) r.sdp = scrubSdp(r.sdp);
        return r;
      }
      async createAnswer(...args) {
        const r = await super.createAnswer(...args);
        if (r && r.sdp) r.sdp = scrubSdp(r.sdp);
        return r;
      }
    }
    pose(FilteredPC, "RTCPeerConnection");
    pose(FilteredPC.prototype.createOffer, "createOffer");
    pose(FilteredPC.prototype.createAnswer, "createAnswer");
    try {
      window.RTCPeerConnection = FilteredPC;
      window.webkitRTCPeerConnection = FilteredPC;
      window.mozRTCPeerConnection = FilteredPC;
    } catch (_) {}
  }

  if (flags.blockSensors) {
    const sensorCtors = ["Accelerometer", "LinearAccelerationSensor", "Gyroscope",
      "AbsoluteOrientationSensor", "RelativeOrientationSensor", "Magnetometer",
      "AmbientLightSensor", "GravitySensor"];
    for (const c of sensorCtors) {
      try {
        if (c in window) {
          const Stub = pose(function () {
            throw new _Error("not allowed");
          }, c);
          window[c] = Stub;
        }
      } catch (_) {}
    }

    const motionEvents = ["devicemotion", "deviceorientation", "deviceorientationabsolute"];
    const origAdd = window.addEventListener;
    const origRemove = window.removeEventListener;
    pose(_defProp(window, "addEventListener", {
      value: function (type, listener, opts) {
        if (motionEvents.indexOf(type) !== -1) return;
        return origAdd.call(this, type, listener, opts);
      },
      writable: true,
      configurable: true
    }) && window.addEventListener, "addEventListener");
    pose(_defProp(window, "removeEventListener", {
      value: function (type, listener, opts) {
        if (motionEvents.indexOf(type) !== -1) return;
        return origRemove.call(this, type, listener, opts);
      },
      writable: true,
      configurable: true
    }) && window.removeEventListener, "removeEventListener");

    for (const ev of motionEvents) {
      try {
        _defProp(window, "on" + ev.replace(/-/g, ""), {
          get: pose(function () { return null; }, "get on" + ev),
          set: function () {},
          configurable: true
        });
      } catch (_) {}
    }

    try {
      if (window.DeviceMotionEvent && DeviceMotionEvent.requestPermission) {
        DeviceMotionEvent.requestPermission = pose(function () { return _Promise.resolve("denied"); }, "requestPermission");
      }
      if (window.DeviceOrientationEvent && DeviceOrientationEvent.requestPermission) {
        DeviceOrientationEvent.requestPermission = pose(function () { return _Promise.resolve("denied"); }, "requestPermission");
      }
    } catch (_) {}
  }

  if (navigator.permissions) {
    const nQuery = Permissions.prototype.query;
    pose(_defProp(Permissions.prototype, "query", {
      value: function (desc) {
        const name = desc && desc.name;
        const map = {
          "geolocation": "prompt",
          "notifications": "prompt",
          "push": "prompt",
          "midi": "denied",
          "camera": "prompt",
          "microphone": "prompt",
          "background-sync": "granted",
          "ambient-light-sensor": "denied",
          "accelerometer": "denied",
          "gyroscope": "denied",
          "magnetometer": "denied",
          "clipboard-read": "prompt",
          "clipboard-write": "granted",
          "screen-wake-lock": "prompt",
          "persistent-storage": "prompt"
        };
        if (name in map) {
          return _Promise.resolve({
            state: map[name],
            status: map[name],
            onchange: null,
            addEventListener: function () {},
            removeEventListener: function () {},
            dispatchEvent: function () { return true; }
          });
        }
        return nQuery.call(this, desc);
      },
      writable: true,
      configurable: true
    }) && Permissions.prototype.query, "query");
  }

  if (navigator.getGamepads) {
    pose(_defProp(Navigator.prototype, "getGamepads", {
      value: function () { return []; },
      writable: true,
      configurable: true
    }) && Navigator.prototype.getGamepads, "getGamepads");
  }

  if (window.indexedDB && window.indexedDB.databases) {
    pose(_defProp(IDBFactory.prototype, "databases", {
      value: function () { return _Promise.resolve([]); },
      writable: true,
      configurable: true
    }) && IDBFactory.prototype.databases, "databases");
  }

  function fontIsStandard(s) {
    const f = String(s || "").toLowerCase();
    for (const c of STD_FONTS) if (f.indexOf(c) !== -1) return true;
    return false;
  }

  if (window.FontFaceSet) {
    try {
      const FS = FontFaceSet.prototype;
      const nCheck = FS.check;
      pose(_defProp(FS, "check", {
        value: function (font, text) { return fontIsStandard(font); },
        writable: true,
        configurable: true
      }) && FS.check, "check");

      try {
        const sizeDesc = _getDesc(FS, "size");
        if (sizeDesc && sizeDesc.get) {
          _defProp(FS, "size", {
            get: pose(function () { return STD_FONTS.length; }, "get size"),
            configurable: true
          });
        }
      } catch (_) {}

      const emptyIter = function () {
        return {
          next: function () { return { value: undefined, done: true }; },
          [Symbol.iterator]: function () { return this; }
        };
      };
      for (const m of ["entries", "values", "keys"]) {
        if (typeof FS[m] === "function") {
          pose(_defProp(FS, m, { value: emptyIter, writable: true, configurable: true })
            && FS[m], m);
        }
      }
      if (typeof FS.forEach === "function") {
        pose(_defProp(FS, "forEach", {
          value: function () {},
          writable: true,
          configurable: true
        }) && FS.forEach, "forEach");
      }
      try {
        _defProp(FS, Symbol.iterator, {
          value: emptyIter,
          writable: true,
          configurable: true
        });
      } catch (_) {}
    } catch (_) {}
  }

  try {
    if (typeof window.queryLocalFonts === "function") {
      window.queryLocalFonts = pose(function () {
        return _Promise.reject(new _Error("NotAllowedError"));
      }, "queryLocalFonts");
    }
    if (navigator.fonts && typeof navigator.fonts.query === "function") {
      pose(_defProp(navigator.fonts.constructor.prototype, "query", {
        value: function () { return _Promise.reject(new _Error("NotAllowedError")); },
        writable: true,
        configurable: true
      }) && navigator.fonts.constructor.prototype.query, "query");
    }
  } catch (_) {}

  // sync XHR + Blob URL. cross-origin scripts and module workers fall back to native
  const WorkerCtor = window.Worker;
  if (WorkerCtor) {
    const wrapWorkerScript = (url) => {
      try {
        const u = new URL(url, location.href);
        const xhr = new XMLHttpRequest();
        xhr.open("GET", u.href, false);
        xhr.send();
        const body = xhr.responseText;
        const shim = "(" + workerShim.toString() + ")(" + JSON.stringify({
          seed: baseSeed, flags
        }) + ");\n";
        const blob = new Blob([shim + body], { type: "application/javascript" });
        return URL.createObjectURL(blob);
      } catch (_) {
        return url;
      }
    };

    function workerShim(cfg) {
      try {
        const seedWord = (function () {
          let s = 2166136261 >>> 0;
          const str = cfg.seed || "blank";
          for (let i = 0; i < str.length; i++) {
            s ^= str.charCodeAt(i);
            s = Math.imul(s, 16777619) >>> 0;
          }
          return s | 0;
        })();

        function noiseBit(x, y, c) {
          let h = (x * 73856093) ^ (y * 19349663) ^ (c * 83492791) ^ seedWord;
          h = Math.imul(h ^ (h >>> 13), 1540483477);
          h ^= h >>> 15;
          return ((h >>> 24) & 1) & (((h >>> 17) & 7) === 0 ? 1 : 0);
        }

        function paintNoise(imageData, ox, oy) {
          const d = imageData.data;
          const w = imageData.width, h = imageData.height;
          for (let y = 0; y < h; y++) {
            for (let x = 0; x < w; x++) {
              const i = (y * w + x) << 2;
              if (d[i + 3] === 0) continue;
              d[i] ^= noiseBit(ox + x, oy + y, 0);
              d[i + 1] ^= noiseBit(ox + x, oy + y, 1);
              d[i + 2] ^= noiseBit(ox + x, oy + y, 2);
            }
          }
        }

        if (typeof OffscreenCanvas !== "undefined" && typeof OffscreenCanvasRenderingContext2D !== "undefined") {
          const proto = OffscreenCanvasRenderingContext2D.prototype;
          const nGet = proto.getImageData;
          proto.getImageData = function (sx, sy, sw, sh, ...rest) {
            const r = nGet.call(this, sx, sy, sw, sh, ...rest);
            paintNoise(r, sx | 0, sy | 0);
            return r;
          };
          const nConv = OffscreenCanvas.prototype.convertToBlob;
          OffscreenCanvas.prototype.convertToBlob = function (...args) {
            try {
              const w = this.width, h = this.height;
              const tmp = new OffscreenCanvas(w, h);
              const cx = tmp.getContext("2d");
              cx.drawImage(this, 0, 0);
              const id = nGet.call(cx, 0, 0, w, h);
              paintNoise(id, 0, 0);
              cx.putImageData(id, 0, 0);
              return nConv.apply(tmp, args);
            } catch (_) {
              return nConv.apply(this, args);
            }
          };
        }

        if (typeof self.navigator === "object") {
          try {
            const coresOpts = [4, 4, 6, 8, 8, 8, 8, 12, 16];
            const cores = coresOpts[(seedWord >>> 0) % coresOpts.length];
            Object.defineProperty(self.navigator.constructor.prototype, "hardwareConcurrency", {
              get: function () { return cores; },
              configurable: true
            });
          } catch (_) {}
        }

        if (typeof performance !== "undefined" && cfg.flags && cfg.flags.reduceTimerPrecision) {
          const np = performance.now;
          performance.now = function () {
            return Math.floor(np.call(this));
          };
        }
      } catch (_) {}
    }

    const HookedWorker = function (url, opts) {
      const finalUrl = wrapWorkerScript(url);
      return new WorkerCtor(finalUrl, opts);
    };
    HookedWorker.prototype = WorkerCtor.prototype;
    pose(HookedWorker, "Worker");
    try { window.Worker = HookedWorker; } catch (_) {}
  }

  try {
    if (window.console) {
      const c = console;
      const noisy = ["debug", "table", "profile", "profileEnd"];
      for (const m of noisy) {
        if (typeof c[m] === "function") {
          c[m] = pose(function () {}, m);
        }
      }
    }
  } catch (_) {}

  try {
    if (window.PerformanceNavigationTiming) {
      const proto = PerformanceNavigationTiming.prototype;
      const fields = ["domainLookupStart", "domainLookupEnd",
        "connectStart", "connectEnd", "secureConnectionStart",
        "requestStart", "responseStart", "responseEnd",
        "domInteractive", "domContentLoadedEventStart", "domContentLoadedEventEnd",
        "domComplete", "loadEventStart", "loadEventEnd"];
      for (const f of fields) {
        const d = _getDesc(proto, f);
        if (!d || !d.get) continue;
        const orig = d.get;
        _defProp(proto, f, {
          get: pose(function () {
            const v = orig.call(this);
            return _Math.floor(v);
          }, "get " + f),
          configurable: true
        });
      }
    }
  } catch (_) {}

  try {
    const PE = window.PerformanceEntry;
    if (PE) {
      const proto = PE.prototype;
      const fields = ["startTime", "duration"];
      for (const f of fields) {
        const d = _getDesc(proto, f);
        if (!d || !d.get) continue;
        const orig = d.get;
        _defProp(proto, f, {
          get: pose(function () {
            const v = orig.call(this);
            return _Math.floor(v);
          }, "get " + f),
          configurable: true
        });
      }
    }
  } catch (_) {}

  for (const api of ["bluetooth", "hid", "serial", "usb", "wakeLock", "ink", "clipboard"]) {
    try {
      if (api in navigator) {
        _defProp(Navigator.prototype, api, {
          get: pose(function () { return undefined; }, "get " + api),
          configurable: true
        });
      }
    } catch (_) {}
  }

  try {
    if (window.PaymentRequest) {
      window.PaymentRequest = pose(function () {
        throw new _Error("not supported");
      }, "PaymentRequest");
    }
  } catch (_) {}

  try {
    if (window.showOpenFilePicker) {
      window.showOpenFilePicker = pose(function () {
        return _Promise.reject(new _Error("aborted"));
      }, "showOpenFilePicker");
    }
    if (window.showSaveFilePicker) {
      window.showSaveFilePicker = pose(function () {
        return _Promise.reject(new _Error("aborted"));
      }, "showSaveFilePicker");
    }
    if (window.showDirectoryPicker) {
      window.showDirectoryPicker = pose(function () {
        return _Promise.reject(new _Error("aborted"));
      }, "showDirectoryPicker");
    }
  } catch (_) {}

  try {
    const E2 = Element.prototype;
    const nGetCS = window.getComputedStyle;
    if (nGetCS) {
      pose(_defProp(window, "getComputedStyle", {
        value: function (el, ps) {
          const cs = nGetCS.call(this, el, ps);
          return cs;
        },
        writable: true,
        configurable: true
      }) && window.getComputedStyle, "getComputedStyle");
    }
  } catch (_) {}

  if (flags.reduceTimerPrecision) {
    try {
      const nDateNow = _Date.now;
      _Date.now = pose(function () {
        return _Math.floor(nDateNow.call(_Date));
      }, "now");
    } catch (_) {}

    try {
      if (typeof performance !== "undefined") {
        const desc = _getDesc(performance.constructor.prototype, "timeOrigin");
        if (desc && desc.get) {
          const orig = desc.get;
          _defProp(performance.constructor.prototype, "timeOrigin", {
            get: pose(function () { return _Math.floor(orig.call(this)); }, "get timeOrigin"),
            configurable: true
          });
        }
      }
    } catch (_) {}
  }

  try {
    const intlNames = ["NumberFormat", "Collator", "RelativeTimeFormat",
                       "PluralRules", "ListFormat", "DisplayNames", "Segmenter"];
    for (const name of intlNames) {
      if (!Intl[name] || !Intl[name].prototype || !Intl[name].prototype.resolvedOptions) continue;
      const proto = Intl[name].prototype;
      const orig = proto.resolvedOptions;
      pose(_defProp(proto, "resolvedOptions", {
        value: function () {
          const r = orig.call(this);
          if ("locale" in r) r.locale = "en-US";
          if ("numberingSystem" in r) r.numberingSystem = "latn";
          if ("calendar" in r) r.calendar = "gregory";
          return r;
        },
        writable: true,
        configurable: true
      }) && proto.resolvedOptions, "resolvedOptions");
    }
  } catch (_) {}

  try {
    if (window.PerformanceTiming) {
      const proto = PerformanceTiming.prototype;
      const fields = ["navigationStart", "unloadEventStart", "unloadEventEnd",
        "redirectStart", "redirectEnd", "fetchStart",
        "domainLookupStart", "domainLookupEnd",
        "connectStart", "connectEnd", "secureConnectionStart",
        "requestStart", "responseStart", "responseEnd",
        "domLoading", "domInteractive",
        "domContentLoadedEventStart", "domContentLoadedEventEnd",
        "domComplete", "loadEventStart", "loadEventEnd"];
      for (const f of fields) {
        const d = _getDesc(proto, f);
        if (!d || !d.get) continue;
        const orig = d.get;
        _defProp(proto, f, {
          get: pose(function () {
            const v = orig.call(this);
            return typeof v === "number" ? _Math.floor(v) : v;
          }, "get " + f),
          configurable: true
        });
      }
    }
  } catch (_) {}

  try {
    const E3 = Element;
    for (const dim of ["scrollWidth", "scrollHeight"]) {
      const desc = _getDesc(E3.prototype, dim);
      if (!desc || !desc.get) continue;
      const orig = desc.get;
      _defProp(E3.prototype, dim, {
        get: pose(function () {
          const v = orig.call(this);
          if (typeof v !== "number" || v === 0) return v;
          return _Math.round(jitter(v, 0.0002, dim.length + 3));
        }, "get " + dim),
        configurable: true
      });
    }
  } catch (_) {}

  try {
    if ("gpu" in Navigator.prototype) {
      _defProp(Navigator.prototype, "gpu", {
        get: pose(function () { return undefined; }, "get gpu"),
        configurable: true
      });
    }
  } catch (_) {}

  if (flags.reduceTimerPrecision) {
    try {
      const rAF = window.requestAnimationFrame;
      if (rAF) {
        window.requestAnimationFrame = pose(function (cb) {
          return rAF.call(this, function (t) {
            try { cb(_Math.floor(t)); } catch (e) { throw e; }
          });
        }, "requestAnimationFrame");
      }
    } catch (_) {}
  }

  try {
    if ("requestMIDIAccess" in Navigator.prototype) {
      pose(_defProp(Navigator.prototype, "requestMIDIAccess", {
        value: function () {
          return _Promise.reject(new _Error("NotAllowedError"));
        },
        writable: true,
        configurable: true
      }) && Navigator.prototype.requestMIDIAccess, "requestMIDIAccess");
    }
    const midiGlobals = ["MIDIAccess", "MIDIInput", "MIDIOutput", "MIDIInputMap",
                         "MIDIOutputMap", "MIDIPort", "MIDIMessageEvent",
                         "MIDIConnectionEvent"];
    for (const g of midiGlobals) {
      try {
        if (g in window) {
          _defProp(window, g, { value: undefined, writable: true, configurable: true });
        }
      } catch (_) {}
    }
  } catch (_) {}

  try {
    if ("xr" in Navigator.prototype) {
      _defProp(Navigator.prototype, "xr", {
        get: pose(function () { return undefined; }, "get xr"),
        configurable: true
      });
    }
    if ("getVRDisplays" in Navigator.prototype) {
      pose(_defProp(Navigator.prototype, "getVRDisplays", {
        value: function () { return _Promise.resolve([]); },
        writable: true,
        configurable: true
      }) && Navigator.prototype.getVRDisplays, "getVRDisplays");
    }
    const xrGlobals = ["VRDisplay", "VRDisplayCapabilities", "VRDisplayEvent",
      "VREyeParameters", "VRFieldOfView", "VRFrameData", "VRPose",
      "VRStageParameters", "XRSystem", "XRSession", "XRReferenceSpace",
      "XRView", "XRViewport", "XRFrame", "XRInputSource", "XRPose",
      "XRRigidTransform"];
    for (const g of xrGlobals) {
      try {
        if (g in window) {
          _defProp(window, g, { value: undefined, writable: true, configurable: true });
        }
      } catch (_) {}
    }
  } catch (_) {}

  try {
    if (window.PointerEvent && PointerEvent.prototype) {
      const zeroPE = ["pressure", "tangentialPressure", "tiltX", "tiltY",
        "twist", "altitudeAngle", "azimuthAngle"];
      for (const f of zeroPE) {
        const d = _getDesc(PointerEvent.prototype, f);
        if (!d || !d.get) continue;
        const orig = d.get;
        _defProp(PointerEvent.prototype, f, {
          get: pose(function () {
            try {
              if (this.pointerType === "pen") return orig.call(this);
            } catch (_) {}
            if (f === "pressure") {
              try { return this.buttons ? 0.5 : 0; } catch (_) { return 0; }
            }
            return 0;
          }, "get " + f),
          configurable: true
        });
      }
      const idDesc = _getDesc(PointerEvent.prototype, "pointerId");
      if (idDesc && idDesc.get) {
        _defProp(PointerEvent.prototype, "pointerId", {
          get: pose(function () { return 1; }, "get pointerId"),
          configurable: true
        });
      }
    }
  } catch (_) {}

  try {
    if (window.ReportingObserver) {
      window.ReportingObserver = pose(function () {
        return {
          observe: function () {},
          disconnect: function () {},
          takeRecords: function () { return []; }
        };
      }, "ReportingObserver");
    }
  } catch (_) {}

  try {
    const speechCtors = ["SpeechRecognition", "webkitSpeechRecognition",
      "SpeechGrammar", "webkitSpeechGrammar",
      "SpeechGrammarList", "webkitSpeechGrammarList",
      "SpeechRecognitionEvent", "webkitSpeechRecognitionEvent",
      "SpeechRecognitionErrorEvent"];
    for (const c of speechCtors) {
      try {
        if (c in window) {
          _defProp(window, c, { value: undefined, writable: true, configurable: true });
        }
      } catch (_) {}
    }
  } catch (_) {}

  try {
    if ("scheduling" in Navigator.prototype) {
      _defProp(Navigator.prototype, "scheduling", {
        get: pose(function () { return undefined; }, "get scheduling"),
        configurable: true
      });
    }
  } catch (_) {}

  try {
    if (window.cookieStore) {
      const stub = {
        get: function () { return _Promise.resolve(null); },
        getAll: function () { return _Promise.resolve([]); },
        set: function () { return _Promise.resolve(); },
        delete: function () { return _Promise.resolve(); },
        addEventListener: function () {},
        removeEventListener: function () {},
        dispatchEvent: function () { return true; }
      };
      _defProp(window, "cookieStore", { value: stub, writable: true, configurable: true });
    }
  } catch (_) {}

  try {
    if (window.performance && typeof performance.measureUserAgentSpecificMemory === "function") {
      performance.measureUserAgentSpecificMemory = pose(function () {
        return _Promise.reject(new _Error("SecurityError"));
      }, "measureUserAgentSpecificMemory");
    }
    if (window.performance && performance.eventCounts) {
      try {
        _defProp(performance, "eventCounts", {
          get: pose(function () {
            return new _Proxy({}, {
              get(_t, p) {
                if (p === Symbol.iterator) return function* () {};
                if (p === "size") return 0;
                if (p === "has") return function () { return false; };
                if (p === "get") return function () { return 0; };
                if (p === "keys" || p === "values" || p === "entries") return function* () {};
                if (p === "forEach") return function () {};
                return undefined;
              }
            });
          }, "get eventCounts"),
          configurable: true
        });
      } catch (_) {}
    }
  } catch (_) {}

  try {
    if (window.Notification && Notification.permission) {
      _defProp(Notification, "permission", {
        get: pose(function () { return "default"; }, "get permission"),
        configurable: true
      });
    }
  } catch (_) {}

  try {
    const firefoxTells = ["InstallTrigger", "sidebar", "netscape",
                          "mozInnerScreenX", "mozInnerScreenY"];
    for (const t of firefoxTells) {
      try {
        if (t in window) {
          _defProp(window, t, {
            get: pose(function () { return undefined; }, "get " + t),
            set: function () {},
            configurable: true
          });
        }
      } catch (_) {}
    }
    if ("taintEnabled" in Navigator.prototype) {
      pose(_defProp(Navigator.prototype, "taintEnabled", {
        value: function () { return false; },
        writable: true,
        configurable: true
      }) && Navigator.prototype.taintEnabled, "taintEnabled");
    }
    
    try {
      const elemStyle = document.documentElement && document.documentElement.style;
      if (elemStyle && "MozAppearance" in elemStyle) {}
    } catch (_) {}
    if (window.CSS && window.CSS.supports) {
      const nSupports = window.CSS.supports;
      pose(_defProp(window.CSS, "supports", {
        value: function (a, b) {
          const s = (a + " " + (b || "")).toLowerCase();
          if (s.indexOf("-moz-") !== -1) return false;
          return nSupports.apply(this, arguments);
        },
        writable: true,
        configurable: true
      }) && window.CSS.supports, "supports");
    }
  } catch (_) {}

  try {
    if (window.ScreenOrientation && ScreenOrientation.prototype) {
      const sop = ScreenOrientation.prototype;
      const typeDesc = _getDesc(sop, "type");
      if (typeDesc && typeDesc.get) {
        _defProp(sop, "type", {
          get: pose(function () { return "landscape-primary"; }, "get type"),
          configurable: true
        });
      }
      const angleDesc = _getDesc(sop, "angle");
      if (angleDesc && angleDesc.get) {
        _defProp(sop, "angle", {
          get: pose(function () { return 0; }, "get angle"),
          configurable: true
        });
      }
    }
  } catch (_) {}

  try {
    if (window.Touch && Touch.prototype) {
      const zeroFields = ["radiusX", "radiusY", "rotationAngle", "force"];
      for (const f of zeroFields) {
        const d = _getDesc(Touch.prototype, f);
        if (!d || !d.get) continue;
        _defProp(Touch.prototype, f, {
          get: pose(function () { return 0; }, "get " + f),
          configurable: true
        });
      }
    }
  } catch (_) {}

  if (flags.reduceTimerPrecision) {
    try {
      if (window.DocumentTimeline && DocumentTimeline.prototype) {
        const d = _getDesc(DocumentTimeline.prototype, "currentTime") ||
                  _getDesc(AnimationTimeline.prototype, "currentTime");
        if (d && d.get) {
          const orig = d.get;
          _defProp(DocumentTimeline.prototype, "currentTime", {
            get: pose(function () {
              const v = orig.call(this);
              return typeof v === "number" ? _Math.floor(v) : v;
            }, "get currentTime"),
            configurable: true
          });
        }
      }
    } catch (_) {}
  }

  try {
    const Stack = _Error.prototype;
    const nStack = _getDesc(Stack, "stack");
    if (nStack && nStack.get) {
      const orig = nStack.get;
      _defProp(Stack, "stack", {
        get: pose(function () {
          const s = orig.call(this);
          if (typeof s !== "string") return s;
          return s.replace(/\bmoz-extension:\/\/[^\/\s]+\/[^\s\n]+/g, "internal");
        }, "get stack"),
        configurable: true
      });
    }
  } catch (_) {}
})();
