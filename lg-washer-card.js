/**
 * LG Washer Card
 * A realistic, animated Lovelace card for LG (ThinQ) washing machines.
 *
 * Draws an actual front-loader illustration (door, tumbling drum, suds,
 * porthole progress ring, 7-segment digital readout, phase indicator
 * lights) and drives every visual from your Home Assistant entities.
 *
 * Works out of the box with the official "LG ThinQ" integration's
 * default entity naming, and can be re-pointed at any entity via config
 * (ha-smartthinq-sensors, template sensors, whatever you've got).
 *
 * https://github.com/marsh4200/lg-washer-card
 */

const CARD_VERSION = "2.0.0";

/* ---------------------------------------------------------------------- */
/*  State normalisation                                                   */
/* ---------------------------------------------------------------------- */

// phase index into PHASES drives the 4 status-lights on the fascia
const PHASES = ["Wash", "Rinse", "Spin", "Done"];

// Every raw state string HA might hand us gets normalised through here.
// Keys are lower-cased / non-alnum-stripped to underscore before lookup,
// so "Washing", "WASHING", "wash-ing" all resolve the same.
const STATE_MAP = {
  // idle / not running
  off: { label: "Off", phase: null, color: "neutral", anim: "none", running: false, icon: "mdi:power" },
  power_off: { label: "Off", phase: null, color: "neutral", anim: "none", running: false, icon: "mdi:power" },
  standby: { label: "Ready", phase: null, color: "neutral", anim: "none", running: false, icon: "mdi:power-standby" },
  initial: { label: "Ready", phase: null, color: "neutral", anim: "none", running: false, icon: "mdi:power-standby" },
  reserve: { label: "Ready", phase: null, color: "neutral", anim: "none", running: false, icon: "mdi:power-standby" },

  // pre-wash
  detecting: { label: "Detecting Load", phase: 0, color: "wash", anim: "tumble-slow", running: true, icon: "mdi:scale-bathroom" },
  detect: { label: "Detecting Load", phase: 0, color: "wash", anim: "tumble-slow", running: true, icon: "mdi:scale-bathroom" },
  weight_sensing: { label: "Detecting Load", phase: 0, color: "wash", anim: "tumble-slow", running: true, icon: "mdi:scale-bathroom" },
  presoak: { label: "Soaking", phase: 0, color: "wash", anim: "tumble-slow", running: true, icon: "mdi:water-outline" },
  pre_wash: { label: "Soaking", phase: 0, color: "wash", anim: "tumble-slow", running: true, icon: "mdi:water-outline" },
  soaking: { label: "Soaking", phase: 0, color: "wash", anim: "tumble-slow", running: true, icon: "mdi:water-outline" },

  // wash
  wash: { label: "Washing", phase: 0, color: "wash", anim: "tumble", running: true, icon: "mdi:washing-machine" },
  washing: { label: "Washing", phase: 0, color: "wash", anim: "tumble", running: true, icon: "mdi:washing-machine" },

  // rinse / steam
  rinse: { label: "Rinsing", phase: 1, color: "rinse", anim: "tumble", running: true, icon: "mdi:water" },
  rinsing: { label: "Rinsing", phase: 1, color: "rinse", anim: "tumble", running: true, icon: "mdi:water" },
  steam: { label: "Steam Care", phase: 1, color: "steam", anim: "tumble-slow", running: true, icon: "mdi:weather-fog" },
  steam_wash: { label: "Steam Care", phase: 1, color: "steam", anim: "tumble-slow", running: true, icon: "mdi:weather-fog" },
  sterilizing: { label: "Sterilizing", phase: 1, color: "steam", anim: "tumble-slow", running: true, icon: "mdi:weather-fog" },
  sterilize: { label: "Sterilizing", phase: 1, color: "steam", anim: "tumble-slow", running: true, icon: "mdi:weather-fog" },
  allergiene: { label: "Allergy Care", phase: 1, color: "steam", anim: "tumble-slow", running: true, icon: "mdi:weather-fog" },

  // spin / dry / cool
  spin: { label: "Spinning", phase: 2, color: "spin", anim: "spin-fast", running: true, icon: "mdi:rotate-3d-variant" },
  spinning: { label: "Spinning", phase: 2, color: "spin", anim: "spin-fast", running: true, icon: "mdi:rotate-3d-variant" },
  dry: { label: "Drying", phase: 2, color: "dry", anim: "tumble", running: true, icon: "mdi:tumble-dryer" },
  drying: { label: "Drying", phase: 2, color: "dry", anim: "tumble", running: true, icon: "mdi:tumble-dryer" },
  cooling: { label: "Cooling Down", phase: 2, color: "cool", anim: "tumble-slow", running: true, icon: "mdi:snowflake" },
  cool_down: { label: "Cooling Down", phase: 2, color: "cool", anim: "tumble-slow", running: true, icon: "mdi:snowflake" },
  cooldown: { label: "Cooling Down", phase: 2, color: "cool", anim: "tumble-slow", running: true, icon: "mdi:snowflake" },
  wrinkle_care: { label: "Wrinkle Care", phase: 2, color: "cool", anim: "tumble-slow", running: true, icon: "mdi:tshirt-crew-outline" },
  wrinklecare: { label: "Wrinkle Care", phase: 2, color: "cool", anim: "tumble-slow", running: true, icon: "mdi:tshirt-crew-outline" },
  anti_crease: { label: "Wrinkle Care", phase: 2, color: "cool", anim: "tumble-slow", running: true, icon: "mdi:tshirt-crew-outline" },

  // done
  end: { label: "Cycle Complete", phase: 3, color: "done", anim: "none", running: false, icon: "mdi:check-circle" },
  complete: { label: "Cycle Complete", phase: 3, color: "done", anim: "none", running: false, icon: "mdi:check-circle" },
  finish: { label: "Cycle Complete", phase: 3, color: "done", anim: "none", running: false, icon: "mdi:check-circle" },
  washing_is_complete: { label: "Cycle Complete", phase: 3, color: "done", anim: "none", running: false, icon: "mdi:check-circle" },
  drying_is_complete: { label: "Cycle Complete", phase: 3, color: "done", anim: "none", running: false, icon: "mdi:check-circle" },

  // exceptions
  pause: { label: "Paused", phase: -1, color: "paused", anim: "none", running: false, icon: "mdi:pause-circle" },
  paused: { label: "Paused", phase: -1, color: "paused", anim: "none", running: false, icon: "mdi:pause-circle" },
  error: { label: "Error", phase: null, color: "error", anim: "none", running: false, icon: "mdi:alert-circle" },
  err: { label: "Error", phase: null, color: "error", anim: "none", running: false, icon: "mdi:alert-circle" },
  error_during_washing: { label: "Error", phase: null, color: "error", anim: "none", running: false, icon: "mdi:alert-circle" },
  drying_failed: { label: "Error", phase: null, color: "error", anim: "none", running: false, icon: "mdi:alert-circle" },
  delay: { label: "Delayed Start", phase: null, color: "neutral", anim: "none", running: false, icon: "mdi:clock-outline" },
  delay_wash: { label: "Delayed Start", phase: null, color: "neutral", anim: "none", running: false, icon: "mdi:clock-outline" },
  reservation: { label: "Delayed Start", phase: null, color: "neutral", anim: "none", running: false, icon: "mdi:clock-outline" },
  freeze_protection: { label: "Freeze Protection", phase: null, color: "cool", anim: "none", running: false, icon: "mdi:snowflake-alert" },
  unavailable: { label: "Unavailable", phase: null, color: "neutral", anim: "none", running: false, icon: "mdi:help-circle-outline" },
  unknown: { label: "Unknown", phase: null, color: "neutral", anim: "none", running: false, icon: "mdi:help-circle-outline" },
};

function normalizeKey(raw) {
  return String(raw ?? "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

function titleCase(str) {
  return String(str ?? "")
    .replace(/_/g, " ")
    .replace(/\w\S*/g, (t) => t[0].toUpperCase() + t.slice(1).toLowerCase());
}

function resolveState(raw) {
  const key = normalizeKey(raw);
  if (STATE_MAP[key]) return { key, ...STATE_MAP[key] };
  if (!key) return { key: "off", ...STATE_MAP.off };
  // best-effort guess for anything we don't recognise
  const running = /run|wash|rinse|spin|dry|steam|active|progress/.test(key);
  return {
    key,
    label: titleCase(key),
    phase: null,
    color: running ? "wash" : "neutral",
    anim: running ? "tumble" : "none",
    running,
    icon: running ? "mdi:washing-machine" : "mdi:washing-machine-alert",
  };
}

/* ---------------------------------------------------------------------- */
/*  Time / progress helpers                                               */
/* ---------------------------------------------------------------------- */

// Accepts minutes (number|numeric string), "HH:MM", "H:MM:SS", or an
// ISO timestamp of estimated completion -> returns whole minutes remaining.
function toMinutes(value, referenceNow) {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value === "number" && Number.isFinite(value)) return Math.max(0, Math.round(value));

  const str = String(value).trim();
  if (str === "") return null;

  if (/^\d+$/.test(str)) return Math.max(0, parseInt(str, 10));

  const hhmm = str.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (hhmm) {
    const h = parseInt(hhmm[1], 10);
    const m = parseInt(hhmm[2], 10);
    return Math.max(0, h * 60 + m);
  }

  const ts = Date.parse(str);
  if (!Number.isNaN(ts)) {
    const diffMs = ts - (referenceNow ?? Date.now());
    return Math.max(0, Math.round(diffMs / 60000));
  }

  return null;
}

function formatMinutes(mins) {
  if (mins === null || mins === undefined) return "--:--";
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  return `${h}:${String(m).padStart(2, "0")}`;
}

/* ---------------------------------------------------------------------- */
/*  Geometry + small SVG helpers                                          */
/* ---------------------------------------------------------------------- */

const CX = 150;
const CY = 216;
const DRUM_R = 76;
const RING_R = 105;
const RING_C = 2 * Math.PI * RING_R;

const r1 = (n) => Math.round(n * 10) / 10;
function pt(r, deg) {
  const a = (deg * Math.PI) / 180;
  return [r1(CX + r * Math.cos(a)), r1(CY + r * Math.sin(a))];
}

/* ---------------------------------------------------------------------- */
/*  Seven-segment display (drawn in SVG on the machine's own panel)       */
/* ---------------------------------------------------------------------- */

const SEG_MAP = {
  "0": "abcdef", "1": "bc", "2": "abged", "3": "abgcd", "4": "fgbc",
  "5": "afgcd", "6": "afgecd", "7": "abc", "8": "abcdefg", "9": "abcdfg",
  "-": "g", " ": "",
  A: "abcefg", b: "cdefg", C: "adef", c: "deg", d: "bcdeg", E: "adefg",
  F: "aefg", H: "bcefg", h: "cefg", I: "bc", i: "c", L: "def", n: "ceg",
  O: "abcdef", o: "cdeg", P: "abefg", r: "eg", S: "afgcd", t: "defg",
  U: "bcdef", u: "cde", y: "bcdfg",
};

function segChars(ch) {
  if (SEG_MAP[ch] !== undefined) return SEG_MAP[ch];
  if (SEG_MAP[ch.toUpperCase()] !== undefined) return SEG_MAP[ch.toUpperCase()];
  if (SEG_MAP[ch.toLowerCase()] !== undefined) return SEG_MAP[ch.toLowerCase()];
  return "";
}

// hexagonal segment polygons
function hSeg(x1, x2, y, t) {
  const h = t / 2;
  return `${x1},${y} ${x1 + h},${y - h} ${x2 - h},${y - h} ${x2},${y} ${x2 - h},${y + h} ${x1 + h},${y + h}`;
}
function vSeg(x, y1, y2, t) {
  const h = t / 2;
  return `${x},${y1} ${x + h},${y1 + h} ${x + h},${y2 - h} ${x},${y2} ${x - h},${y2 - h} ${x - h},${y1 + h}`;
}
function digitSegs(x, y, w = 13, h = 24, t = 2.8) {
  const g = 0.7; // gap between segments
  const mid = y + h / 2;
  return {
    a: hSeg(x + g + t / 2, x + w - g - t / 2, y + t / 2, t),
    g: hSeg(x + g + t / 2, x + w - g - t / 2, mid, t),
    d: hSeg(x + g + t / 2, x + w - g - t / 2, y + h - t / 2, t),
    f: vSeg(x + t / 2, y + g + t / 2, mid - g, t),
    b: vSeg(x + w - t / 2, y + g + t / 2, mid - g, t),
    e: vSeg(x + t / 2, mid + g, y + h - g - t / 2, t),
    c: vSeg(x + w - t / 2, mid + g, y + h - g - t / 2, t),
  };
}

const DIGIT_X = [164, 181, 202, 219];
const DIGIT_X_TEXT = [167, 184, 201, 218];
const DIGIT_Y = 28;

// chars: array of 4 chars, colon: bool
function lcdSvg(chars, colon) {
  let off = "";
  let on = "";
  chars.forEach((ch, i) => {
    const segs = digitSegs((colon ? DIGIT_X : DIGIT_X_TEXT)[i], DIGIT_Y);
    const lit = segChars(ch);
    Object.keys(segs).forEach((k) => {
      const poly = `<polygon points="${segs[k]}"/>`;
      if (lit.includes(k)) on += poly;
      else off += poly;
    });
  });
  const colonSvg = `<circle cx="198" cy="35" r="1.7"/><circle cx="198" cy="45" r="1.7"/>`;
  return `
    <g class="lcd-off">${off}</g>
    <g class="lcd-on" filter="url(#lgw-led-glow)">${on}${colon ? `<g class="lcd-colon">${colonSvg}</g>` : ""}</g>`;
}

/* ---------------------------------------------------------------------- */
/*  Drum contents: laundry, water, steam                                  */
/* ---------------------------------------------------------------------- */

const CLOTH = {
  A: "M-16,-6 C-14,-14 -2,-15 4,-11 C10,-15 18,-10 16,-3 C19,4 12,12 4,10 C-2,15 -14,12 -15,5 C-20,2 -19,-3 -16,-6 Z",
  B: "M-15,-9 C-6,-13 8,-12 15,-7 C18,-1 16,7 10,10 C2,13 -8,12 -13,8 C-18,3 -18,-4 -15,-9 Z",
  C: "M-10,-6 C-3,-10 6,-9 10,-4 C12,2 7,8 1,8 C-5,9 -12,5 -11,0 Z",
};
const FOLD = {
  A: "M-11,-1 C-5,3 3,-4 11,1 M-4,-10 C-3,-5 1,-4 3,-7",
  B: "M-12,-2 C-4,1 5,-3 13,0 M-10,5 C-2,7 5,5 10,6",
  C: "M-7,-1 C-2,2 3,-2 8,0",
};
const COLORS = ["#e76f51", "#5f84d6", "#e9c46a", "#2a9d8f", "#f2a7b8", "#efebe3", "#8e6fc7", "#3d4a63"];

function cloth(shape, color) {
  return `<use href="#lgw-cloth-${shape}" fill="${color}"/>` +
    `<use href="#lgw-cloth-${shape}" fill="url(#lgw-cloth-shade)"/>` +
    `<use href="#lgw-fold-${shape}"/>`;
}

// resting pile at the bottom of the drum
const PILE = [
  [102, 258, "B", 5, 1.2, -40],
  [198, 258, "A", 7, 1.2, 34],
  [138, 250, "C", 3, 1.3, -24],
  [168, 246, "A", 4, 1.15, 14],
  [120, 274, "A", 0, 1.4, -8],
  [158, 280, "B", 1, 1.5, 4],
  [190, 272, "C", 2, 1.4, 22],
];

function pileSvg(items = PILE) {
  return items
    .map(([x, y, s, c, sc, rot]) =>
      `<g transform="translate(${x},${y}) rotate(${rot}) scale(${sc})">${cloth(s, COLORS[c])}</g>`)
    .join("");
}

// one tumbling garment: carried up the left wall (drum turns clockwise), then drops
function tumbler(i, { r, a0, a1, shape, color, scale, dur, spinDir }) {
  const [x0, y0] = pt(r, a0);
  const [x1, y1] = pt(r, a1);
  const cx = r1(x1 + (x0 - x1) * 0.25 + 8);
  const cy = r1(y1 + (y0 - y1) * 0.55);
  const path = `M${x0},${y0} A${r},${r} 0 0 1 ${x1},${y1} Q${cx},${cy} ${x0},${y0}`;
  const arcLen = (r * (a1 - a0) * Math.PI) / 180;
  const fallLen = Math.hypot(x1 - x0, y1 - y0);
  const frac = r1((arcLen / (arcLen + fallLen)) * 100) / 100;
  const begin = -((i * dur) / 4 + 0.13 * i);
  return `
    <g>
      <animateMotion dur="${dur}s" begin="${begin}s" repeatCount="indefinite" path="${path}"
        calcMode="spline" keyPoints="0;${frac};1" keyTimes="0;0.74;1"
        keySplines="0.4 0 0.6 1;0.55 0 0.95 0.75"/>
      <g transform="scale(${scale})">
        <g>
          <animateTransform attributeName="transform" type="rotate" additive="sum"
            from="0" to="${360 * spinDir}" dur="${r1(dur * 1.35)}s" begin="${begin}s" repeatCount="indefinite"/>
          ${cloth(shape, color)}
        </g>
      </g>
    </g>`;
}

function tumbleSvg(slow, waterHtml = "") {
  const dur = slow ? 4.8 : 2.9;
  const pieces = [
    { r: 54, a0: 96, a1: 222, shape: "A", color: COLORS[0], scale: 1.35, spinDir: 1 },
    { r: 50, a0: 104, a1: 236, shape: "B", color: COLORS[1], scale: 1.3, spinDir: -1 },
    { r: 56, a0: 88, a1: 214, shape: "C", color: COLORS[2], scale: 1.5, spinDir: 1 },
    { r: 46, a0: 100, a1: 244, shape: "A", color: COLORS[4], scale: 1.15, spinDir: -1 },
  ];
  const rest = [
    [114, 272, "B", 3, 1.35, -14],
    [158, 280, "A", 5, 1.4, 6],
    [192, 266, "C", 6, 1.4, 26],
    [138, 258, "C", 7, 1.2, -20],
  ];
  return `
    <g class="pile-rock">${pileSvg(rest)}</g>
    ${waterHtml}
    ${pieces.map((p, i) => tumbler(i, { ...p, dur })).join("")}`;
}

// clothes pinned to the drum wall at spin speed
function spinSvg() {
  const segs = [
    [COLORS[0], 0], [COLORS[1], 58], [COLORS[2], 120], [COLORS[3], 190],
    [COLORS[4], 250], [COLORS[5], 300], [COLORS[6], 340],
  ];
  const r = 66;
  const c = 2 * Math.PI * r;
  const arcs = segs
    .map(([col, deg]) => {
      const len = r1(c * 0.17);
      return `<circle cx="${CX}" cy="${CY}" r="${r}" fill="none" stroke="${col}" stroke-width="15"
        stroke-dasharray="${len} ${r1(c - len)}" transform="rotate(${deg} ${CX} ${CY})" stroke-linecap="round"/>`;
    })
    .join("");
  return `<g class="spin-ring" filter="url(#lgw-motion-blur)">${arcs}</g>
          <circle cx="${CX}" cy="${CY}" r="58" fill="none" stroke="rgba(255,255,255,.18)" stroke-width="1.5" stroke-dasharray="3 9" class="spin-ring"/>`;
}

function wavePath(level, amp, len, phase) {
  let d = `M${-40 + phase},${level}`;
  for (let x = -40 + phase; x < 320; x += len) {
    d += ` q${len / 4},${-amp} ${len / 2},0 q${len / 4},${amp} ${len / 2},0`;
  }
  d += ` L320,320 L-40,320 Z`;
  return d;
}

function waterSvg(kind) {
  const level = kind === "rinse" ? 234 : 243;
  const cls = kind === "rinse" ? "water rinse" : "water";
  const bubbles = [
    [112, 0.0, 2.2], [128, 0.7, 1.6], [146, 1.3, 2.6], [162, 0.4, 1.8],
    [178, 1.0, 2.2], [194, 1.7, 1.5], [136, 2.0, 1.4], [170, 2.4, 2.0],
  ]
    .map(([x, d, rr]) => `<circle class="bub" cx="${x}" cy="${level + 4}" r="${rr}" style="animation-delay:-${d}s"/>`)
    .join("");
  const foam = kind === "rinse" ? "" :
    [[92, 3], [101, 5], [112, 3.5], [124, 6], [137, 4], [150, 6.5], [163, 4.5], [175, 6], [188, 3.5], [199, 5], [209, 3]]
      .map(([x, rr], i) => `<circle class="foam" cx="${x}" cy="${level - 1 + (i % 3) - 1}" r="${rr}" style="animation-delay:-${(i * 0.37).toFixed(2)}s"/>`)
      .join("");
  return `
    <g class="${cls}">
      <path class="wave back" d="${wavePath(level - 3, 3, 44, 22)}"/>
      <path class="wave front" d="${wavePath(level, 3.5, 40, 0)}"/>
      ${bubbles}
      <g class="foam-row" filter="url(#lgw-foam-blur)">${foam}</g>
    </g>`;
}

function steamSvg() {
  const wisps = [[112, 0], [138, 1.1], [164, 0.5], [188, 1.6], [150, 2.2]]
    .map(([x, d]) =>
      `<path class="wisp" d="M${x},292 c-9,-12 9,-22 0,-34 c-9,-12 7,-22 0,-34" style="animation-delay:-${d}s"/>`)
    .join("");
  return `<circle class="fog" cx="${CX}" cy="${CY}" r="${DRUM_R}"/><g filter="url(#lgw-soft)">${wisps}</g>`;
}

function heatSvg() {
  return `<circle class="heat" cx="${CX}" cy="${CY}" r="${DRUM_R}" fill="url(#lgw-heat)"/>`;
}

/* ---------------------------------------------------------------------- */
/*  Card                                                                  */
/* ---------------------------------------------------------------------- */

class LgWasherCard extends HTMLElement {
  static getStubConfig(hass) {
    const entities = hass ? Object.keys(hass.states) : [];
    const guess = (suffix) => entities.find((e) => e.endsWith(suffix)) || "";
    return {
      type: "custom:lg-washer-card",
      name: "Washing Machine",
      status_entity: guess("_current_status") || guess("washer") || "sensor.washer_current_status",
      remaining_time_entity: guess("_remaining_time") || "sensor.washer_remaining_time",
      total_time_entity: guess("_total_time") || "sensor.washer_total_time",
      course_entity: guess("_course") || "",
      door_lock_entity: guess("_door_lock") || "",
      child_lock_entity: guess("_child_lock") || "",
      power_entity: guess("washer_power") || "",
    };
  }

  static getConfigElement() {
    return document.createElement("lg-washer-card-editor");
  }

  setConfig(config) {
    if (!config || !(config.status_entity || config.entity)) {
      throw new Error("lg-washer-card: 'status_entity' is required (the sensor that reports the machine's run state).");
    }
    this._config = {
      name: "Washing Machine",
      status_entity: config.entity || config.status_entity,
      remaining_time_entity: "",
      total_time_entity: "",
      progress_entity: "",
      course_entity: "",
      temperature_entity: "",
      spin_speed_entity: "",
      door_lock_entity: "",
      door_open_entity: "",
      child_lock_entity: "",
      power_entity: "",
      error_entity: "",
      body_color: "white",
      show_progress_ring: true,
      show_phase_lights: true,
      tap_action_more_info: true,
      ...config,
    };
    this._lastRenderKey = null;
    this._sceneKey = null;
    if (!this.shadowRoot) this.attachShadow({ mode: "open" });
    this._buildStaticDom();
    if (this._hass) this._update();
  }

  set hass(hass) {
    this._hass = hass;
    if (!this._config) return;
    this._update();
  }

  getCardSize() {
    return 7;
  }

  connectedCallback() {
    this._tickTimer = setInterval(() => this._update(true), 30000);
  }

  disconnectedCallback() {
    if (this._tickTimer) clearInterval(this._tickTimer);
  }

  /* ---- internals ---- */

  _getState(entityId) {
    if (!entityId || !this._hass) return undefined;
    return this._hass.states[entityId];
  }

  _fire(entityId) {
    if (!entityId) return;
    const event = new Event("hass-more-info", { bubbles: true, composed: true });
    event.detail = { entityId };
    this.dispatchEvent(event);
  }

  _togglePower() {
    const cfg = this._config;
    if (!cfg.power_entity || !this._hass) return;
    const st = this._getState(cfg.power_entity);
    const domain = cfg.power_entity.split(".")[0];
    const service = domain === "switch" ? "switch" : "homeassistant";
    this._hass.callService(service, st && st.state === "on" ? "turn_off" : "turn_on", {
      entity_id: cfg.power_entity,
    });
  }

  _buildStaticDom() {
    const root = this.shadowRoot;
    const lifter = "M-10,-76.5 L-6.5,-61 Q0,-56 6.5,-61 L10,-76.5 Z";
    const ticks = Array.from({ length: 12 }, (_, i) => {
      const [x, y] = [112 + 21 * Math.cos(((-150 + i * 25) - 90) * Math.PI / 180), 40 + 21 * Math.sin(((-150 + i * 25) - 90) * Math.PI / 180)];
      return `<circle class="tick" data-i="${i}" cx="${r1(x)}" cy="${r1(y)}" r="1.1"/>`;
    }).join("");

    root.innerHTML = `
      <style>${STYLE}</style>
      <ha-card>
        <div class="header">
          <div class="title-wrap">
            <span class="title"></span>
            <span class="course"></span>
          </div>
          <span class="pct"></span>
        </div>

        <div class="machine" tabindex="0" role="button" aria-label="Washing machine status">
          <svg class="art" viewBox="0 0 300 372">
            <defs>
              <linearGradient id="lgw-body" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" class="s-body-a"/><stop offset="1" class="s-body-b"/>
              </linearGradient>
              <linearGradient id="lgw-sides" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0" stop-color="#000" stop-opacity=".10"/>
                <stop offset=".08" stop-color="#000" stop-opacity="0"/>
                <stop offset=".9" stop-color="#000" stop-opacity="0"/>
                <stop offset="1" stop-color="#000" stop-opacity=".16"/>
              </linearGradient>
              <linearGradient id="lgw-panel" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" class="s-panel-a"/><stop offset="1" class="s-panel-b"/>
              </linearGradient>
              <radialGradient id="lgw-bezel" cx=".4" cy=".3" r=".8">
                <stop offset="0" class="s-bezel-a"/><stop offset="1" class="s-bezel-b"/>
              </radialGradient>
              <linearGradient id="lgw-chrome" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stop-color="#ffffff"/>
                <stop offset=".3" stop-color="#9aa1a9"/>
                <stop offset=".52" stop-color="#f1f3f5"/>
                <stop offset=".78" stop-color="#737b84"/>
                <stop offset="1" stop-color="#d7dbe0"/>
              </linearGradient>
              <radialGradient id="lgw-drum-back" cx=".5" cy=".5" r=".5">
                <stop offset="0" stop-color="#c3c9cf"/>
                <stop offset=".55" stop-color="#8a9299"/>
                <stop offset="1" stop-color="#40464d"/>
              </radialGradient>
              <radialGradient id="lgw-vignette" cx=".5" cy=".5" r=".5">
                <stop offset=".62" stop-color="#000" stop-opacity="0"/>
                <stop offset="1" stop-color="#000" stop-opacity=".55"/>
              </radialGradient>
              <radialGradient id="lgw-tint" cx=".5" cy=".45" r=".5">
                <stop offset="0" stop-color="#1d3a52" stop-opacity=".10"/>
                <stop offset=".8" stop-color="#0d1c29" stop-opacity=".28"/>
                <stop offset="1" stop-color="#050b11" stop-opacity=".6"/>
              </radialGradient>
              <linearGradient id="lgw-sheen" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stop-color="#fff" stop-opacity=".55"/>
                <stop offset="1" stop-color="#fff" stop-opacity="0"/>
              </linearGradient>
              <linearGradient id="lgw-lifter" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stop-color="#d9dde1"/><stop offset="1" stop-color="#8e969e"/>
              </linearGradient>
              <linearGradient id="lgw-cloth-shade" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stop-color="#fff" stop-opacity=".28"/>
                <stop offset=".5" stop-color="#fff" stop-opacity="0"/>
                <stop offset="1" stop-color="#000" stop-opacity=".3"/>
              </linearGradient>
              <linearGradient id="lgw-water" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stop-color="#8fc8f5" stop-opacity=".7"/>
                <stop offset="1" stop-color="#2c6fb3" stop-opacity=".75"/>
              </linearGradient>
              <radialGradient id="lgw-heat" cx=".5" cy=".75" r=".7">
                <stop offset="0" stop-color="#ffb347" stop-opacity=".45"/>
                <stop offset="1" stop-color="#ff7a18" stop-opacity="0"/>
              </radialGradient>
              <radialGradient id="lgw-lcd" cx=".5" cy="0" r="1.2">
                <stop offset="0" stop-color="#1b2128"/><stop offset="1" stop-color="#07090b"/>
              </radialGradient>
              <pattern id="lgw-perf" width="7" height="7" patternUnits="userSpaceOnUse">
                <circle cx="3.5" cy="3.5" r="1.05" fill="#000" fill-opacity=".32"/>
              </pattern>
              <clipPath id="lgw-drum-clip"><circle cx="${CX}" cy="${CY}" r="${DRUM_R}"/></clipPath>
              <filter id="lgw-led-glow" x="-30%" y="-30%" width="160%" height="160%">
                <feGaussianBlur stdDeviation="1.1" result="b"/>
                <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
              </filter>
              <filter id="lgw-ring-glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="2.4" result="b"/>
                <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
              </filter>
              <filter id="lgw-motion-blur" x="-10%" y="-10%" width="120%" height="120%">
                <feGaussianBlur stdDeviation="2.2"/>
              </filter>
              <filter id="lgw-soft" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="3"/>
              </filter>
              <filter id="lgw-foam-blur" x="-20%" y="-50%" width="140%" height="200%">
                <feGaussianBlur stdDeviation=".9"/>
              </filter>
              <filter id="lgw-shadow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="5"/>
              </filter>
              ${Object.keys(CLOTH).map((k) => `<path id="lgw-cloth-${k}" d="${CLOTH[k]}"/>`).join("")}
              ${Object.keys(FOLD).map((k) => `<path id="lgw-fold-${k}" d="${FOLD[k]}" fill="none" stroke="#000" stroke-opacity=".2" stroke-width="1.5" stroke-linecap="round"/>`).join("")}
            </defs>

            <ellipse cx="150" cy="364" rx="128" ry="7" fill="#000" opacity=".28" filter="url(#lgw-shadow)"/>

            <g class="body">
              <!-- feet -->
              <rect x="40" y="350" width="22" height="9" rx="2" class="foot"/>
              <rect x="238" y="350" width="22" height="9" rx="2" class="foot"/>

              <!-- cabinet -->
              <rect x="22" y="8" width="256" height="346" rx="16" fill="url(#lgw-body)"/>
              <rect x="22" y="8" width="256" height="346" rx="16" fill="url(#lgw-sides)"/>
              <rect x="22.5" y="8.5" width="255" height="345" rx="15.5" class="edge"/>

              <!-- control panel -->
              <path d="M22,72 V24 A16,16 0 0 1 38,8 H262 A16,16 0 0 1 278,24 V72 Z" fill="url(#lgw-panel)"/>
              <line x1="22" y1="72.5" x2="278" y2="72.5" class="seam"/>
              <line x1="30" y1="10.5" x2="270" y2="10.5" class="topgloss"/>

              <!-- detergent drawer -->
              <rect x="30" y="20" width="58" height="40" rx="5" class="drawer"/>
              <rect x="30" y="20" width="58" height="40" rx="5" class="drawer-edge"/>
              <rect x="38" y="48" width="42" height="5" rx="2.5" class="drawer-slot"/>

              <!-- program knob -->
              <g class="knob-wrap">
                ${ticks}
                <circle cx="112" cy="40" r="16" fill="url(#lgw-chrome)"/>
                <circle cx="112" cy="40" r="12.5" class="knob-face"/>
                <line x1="112" y1="33" x2="112" y2="29.5" class="knob-mark"/>
              </g>

              <!-- display -->
              <rect x="136" y="21" width="112" height="38" rx="6" fill="url(#lgw-lcd)"/>
              <rect x="136.5" y="21.5" width="111" height="37" rx="5.5" class="lcd-edge"/>
              <path d="M140,24 H244 Q244,31 236,31 H146 Q140,31 140,24 Z" fill="#fff" opacity=".05"/>
              <g class="lcd-icons">
                <g class="ico-lock" transform="translate(148,33)">
                  <rect x="-3.6" y="-1" width="7.2" height="5.6" rx="1"/>
                  <path d="M-2.2,-1 v-1.8 a2.2,2.2 0 0 1 4.4,0 v1.8" fill="none" stroke-width="1.3"/>
                </g>
                <g class="ico-wifi" transform="translate(148,49)">
                  <path d="M-4.6,-1.4 a6.5,6.5 0 0 1 9.2,0" fill="none" stroke-width="1.3"/>
                  <path d="M-2.7,0.6 a3.8,3.8 0 0 1 5.4,0" fill="none" stroke-width="1.3"/>
                  <circle cx="0" cy="2.6" r="1"/>
                </g>
              </g>
              <g class="lcd"></g>

              <!-- power button -->
              <g class="pwr" transform="translate(264,40)">
                <circle r="10" class="pwr-bg"/>
                <circle r="10" class="pwr-ring"/>
                <path d="M-3.2,-2.6 a4.4,4.4 0 1 0 6.4,0 M0,-5 v4.6" class="pwr-glyph"/>
              </g>

              <!-- kick plate + filter hatch -->
              <line x1="22" y1="327.5" x2="278" y2="327.5" class="seam"/>
              <rect x="36" y="333" width="30" height="14" rx="3" class="hatch"/>

              <!-- progress ring -->
              <circle cx="${CX}" cy="${CY}" r="${RING_R}" class="ring-track"/>
              <circle cx="${CX}" cy="${CY}" r="${RING_R}" class="ring-bar" filter="url(#lgw-ring-glow)"
                      transform="rotate(-90 ${CX} ${CY})" stroke-dasharray="0 ${RING_C}"/>

              <!-- door opening: gasket + drum (visible through glass) -->
              <circle cx="${CX}" cy="${CY}" r="86" class="gasket"/>
              <circle cx="${CX}" cy="${CY}" r="82" class="gasket-lip"/>
              <g clip-path="url(#lgw-drum-clip)">
                <circle cx="${CX}" cy="${CY}" r="${DRUM_R}" fill="url(#lgw-drum-back)"/>
                <circle cx="${CX}" cy="${CY}" r="26" fill="none" stroke="#000" stroke-opacity=".18" stroke-width="2"/>
                <circle cx="${CX}" cy="${CY}" r="9" fill="#000" fill-opacity=".16"/>
                <g class="drum-rot">
                  <circle cx="${CX}" cy="${CY}" r="${DRUM_R}" fill="url(#lgw-perf)"/>
                  <circle cx="${CX}" cy="${CY}" r="71" fill="none" stroke="#fff" stroke-opacity=".10" stroke-width="7"/>
                  ${[0, 120, 240].map((a) => `<path d="${lifter}" transform="translate(${CX} ${CY}) rotate(${a})" fill="url(#lgw-lifter)" stroke="#000" stroke-opacity=".25" stroke-width=".8"/>`).join("")}
                </g>
                <g class="scene"></g>
                <circle cx="${CX}" cy="${CY}" r="${DRUM_R}" fill="url(#lgw-vignette)"/>
              </g>

              <!-- door: bezel + chrome ring + tinted glass (swings on left hinge) -->
              <g class="door">
                <circle cx="${CX}" cy="${CY}" r="95.5" fill="none" stroke="url(#lgw-bezel)" stroke-width="6" class="bezel"/>
                <circle cx="${CX}" cy="${CY}" r="98" class="bezel-edge"/>
                <circle cx="${CX}" cy="${CY}" r="89" fill="none" stroke="url(#lgw-chrome)" stroke-width="9"/>
                <circle cx="${CX}" cy="${CY}" r="84.5" fill="none" stroke="#000" stroke-opacity=".35" stroke-width="1"/>
                <circle cx="${CX}" cy="${CY}" r="84" fill="url(#lgw-tint)"/>
                <circle cx="${CX}" cy="${CY}" r="82" fill="none" stroke="#000" stroke-opacity=".28" stroke-width="4"/>
                <ellipse cx="116" cy="170" rx="50" ry="17" transform="rotate(-38 116 170)" fill="url(#lgw-sheen)" opacity=".55"/>
                <path d="M${pt(74, 196).join(",")} A74,74 0 0 1 ${pt(74, 252).join(",")}" class="glint"/>
                <path d="M${pt(74, 22).join(",")} A74,74 0 0 1 ${pt(74, 48).join(",")}" class="glint dim"/>
                <rect x="238" y="194" width="9" height="44" rx="4.5" class="handle"/>
                <circle cx="${CX}" cy="${CY}" r="98" class="door-shade"/>
              </g>

              <!-- done tick on the glass -->
              <g class="done-mark">
                <circle cx="${CX}" cy="${CY}" r="26" class="done-bg"/>
                <path d="M${CX - 11},${CY + 1} L${CX - 3},${CY + 9} L${CX + 12},${CY - 8}" class="done-check"/>
              </g>
            </g>
          </svg>
        </div>

        <div class="status-row">
          <div class="status-badge"><ha-icon class="status-icon" icon="mdi:washing-machine"></ha-icon></div>
          <div class="status-text">
            <span class="status-label">Ready</span>
            <span class="status-sub"></span>
          </div>
        </div>

        <div class="phases"></div>
        <div class="chips"></div>
      </ha-card>
    `;

    root.querySelector(".machine").addEventListener("click", () => {
      if (this._config.tap_action_more_info) this._fire(this._config.status_entity);
    });
    root.querySelector(".pwr").addEventListener("click", (e) => {
      if (!this._config.power_entity) return;
      e.stopPropagation();
      this._togglePower();
    });
  }

  _renderScene(motion, medium) {
    const key = `${motion}|${medium}`;
    if (key === this._sceneKey) return;
    this._sceneKey = key;
    let html = "";
    if (medium === "steam") html += steamSvg();
    if (medium === "heat") html += heatSvg();
    if (motion === "tumble" || motion === "tumble-slow") {
      const water = medium === "water" || medium === "rinse" ? waterSvg(medium) : "";
      html += tumbleSvg(motion === "tumble-slow", water);
    } else if (motion === "spin-fast") {
      html += `<g class="spin-wrap">${spinSvg()}</g>`;
    } else {
      html += pileSvg();
    }
    this.shadowRoot.querySelector(".scene").innerHTML = html;
  }

  _lcdContent({ resolved, remainMin, totalMin, childLock, errorCode, paused }) {
    const right = (s) => {
      const arr = String(s).slice(-4).split("");
      while (arr.length < 4) arr.unshift(" ");
      return arr;
    };
    if (resolved.key === "off" || resolved.key === "unavailable") return { chars: [" ", " ", " ", " "], colon: false, mode: "dark" };
    if (errorCode || resolved.color === "error") {
      const code = errorCode ? String(errorCode).replace(/[^a-z0-9]/gi, "") : "Err";
      return { chars: right(code.slice(0, 3) || "Err"), colon: false, mode: "error" };
    }
    if (resolved.phase === 3) return { chars: [" ", "E", "n", "d"], colon: false, mode: "on" };
    if (childLock && !resolved.running && !paused) return { chars: [" ", " ", "C", "L"], colon: false, mode: "on" };
    const mins = resolved.running || paused ? remainMin : (totalMin ?? remainMin);
    if (mins === null || mins === undefined) return { chars: [" ", "-", "-", "-"], colon: true, mode: "on" };
    const h = Math.min(99, Math.floor(mins / 60));
    const m = Math.round(mins % 60);
    const hs = String(h).padStart(2, " ");
    const ms = String(m).padStart(2, "0");
    return { chars: [hs[0], hs[1], ms[0], ms[1]], colon: true, mode: paused ? "blink" : (resolved.running ? "run" : "on") };
  }

  _update(tickOnly) {
    if (!this._hass || !this._config) return;
    const cfg = this._config;
    const root = this.shadowRoot;

    const statusState = this._getState(cfg.status_entity);
    const rawState = statusState ? statusState.state : "unavailable";
    const resolved = resolveState(rawState);

    const remainRaw = cfg.remaining_time_entity ? this._getState(cfg.remaining_time_entity)?.state : undefined;
    const totalRaw = cfg.total_time_entity ? this._getState(cfg.total_time_entity)?.state : undefined;
    const remainMin = toMinutes(remainRaw);
    const totalMin = toMinutes(totalRaw);

    let progress = null;
    if (cfg.progress_entity) {
      const p = this._getState(cfg.progress_entity)?.state;
      const pf = parseFloat(p);
      if (Number.isFinite(pf)) progress = Math.min(100, Math.max(0, pf));
    } else if (remainMin !== null && totalMin) {
      progress = Math.min(100, Math.max(0, 100 - (remainMin / totalMin) * 100));
    }
    if (!resolved.running && resolved.phase === 3) progress = 100;
    if (!resolved.running && resolved.phase === null && progress === null) progress = 0;

    const doorLocked = cfg.door_lock_entity ? this._getState(cfg.door_lock_entity)?.state === "on" : null;
    const doorOpen = cfg.door_open_entity ? this._getState(cfg.door_open_entity)?.state === "on" : false;
    const childLock = cfg.child_lock_entity ? this._getState(cfg.child_lock_entity)?.state === "on" : false;
    const course = cfg.course_entity ? this._getState(cfg.course_entity)?.state : null;
    const temperature = cfg.temperature_entity ? this._getState(cfg.temperature_entity)?.state : null;
    const spinSpeed = cfg.spin_speed_entity ? this._getState(cfg.spin_speed_entity)?.state : null;
    let errorCode = cfg.error_entity ? this._getState(cfg.error_entity)?.state : null;
    if (["", "none", "no_error", "unknown", "unavailable", "off", "ok"].includes(normalizeKey(errorCode))) errorCode = null;
    const powerOn = cfg.power_entity ? this._getState(cfg.power_entity)?.state === "on" : null;
    const validCourse = course && !["unknown", "unavailable", "none", ""].includes(normalizeKey(course)) ? course : null;

    const renderKey = JSON.stringify([
      resolved.key, remainMin, totalMin, progress, doorLocked, doorOpen, childLock,
      validCourse, temperature, spinSpeed, errorCode, powerOn, cfg.name, cfg.body_color,
    ]);
    if (tickOnly && renderKey === this._lastRenderKey) return;
    this._lastRenderKey = renderKey;

    const paused = resolved.color === "paused";
    if (resolved.running) {
      this._lastAnim = resolved.anim;
      this._lastColor = resolved.color;
      this._lastPhase = resolved.phase;
    }
    const isError = resolved.color === "error" || !!errorCode;
    const colorKey = isError ? "error" : resolved.color;

    const card = root.querySelector("ha-card");
    const colorVar = `var(--lgw-${colorKey})`;
    card.style.setProperty("--lgw-active", colorVar);

    // header
    root.querySelector(".title").textContent = cfg.name;
    root.querySelector(".course").textContent = validCourse ? titleCase(validCourse) : "";
    const pctEl = root.querySelector(".pct");
    pctEl.textContent = (resolved.running || paused) && progress !== null ? `${Math.round(progress)}%` : "";

    // status row
    root.querySelector(".status-icon").setAttribute("icon", isError ? "mdi:alert-circle" : resolved.icon);
    root.querySelector(".status-label").textContent = errorCode ? `Error ${errorCode}` : resolved.label;
    let sub = "";
    if ((resolved.running || paused) && remainMin !== null) {
      const lang = this._hass.locale?.language || this._hass.language || undefined;
      let endsAt = "";
      try {
        endsAt = new Date(Date.now() + remainMin * 60000).toLocaleTimeString(lang, { hour: "2-digit", minute: "2-digit" });
      } catch (e) {
        endsAt = "";
      }
      const left = remainMin >= 60 ? `${Math.floor(remainMin / 60)}h ${String(remainMin % 60).padStart(2, "0")}m left` : `${remainMin} min left`;
      sub = paused ? `${left} · paused` : `${left}${endsAt ? ` · ends ${endsAt}` : ""}`;
    } else if (resolved.phase === 3) {
      sub = "Laundry is ready";
    } else if (doorOpen) {
      sub = "Door open";
    } else if (!resolved.running && totalMin && resolved.key !== "off") {
      sub = `${formatMinutes(totalMin)} cycle`;
    }
    root.querySelector(".status-sub").textContent = sub;

    // machine classes
    let motion = resolved.running ? resolved.anim : paused ? this._lastAnim || "tumble" : "none";
    if (doorOpen) motion = "none";
    const mediumSrc = resolved.running ? resolved.color : paused ? this._lastColor || "wash" : null;
    let medium = { wash: "water", rinse: "rinse", steam: "steam", dry: "heat" }[mediumSrc] || "none";
    if (motion === "spin-fast" || motion === "none") medium = medium === "steam" || medium === "heat" ? medium : "none";
    if (motion === "none" && !paused) medium = "none";

    const machine = root.querySelector(".machine");
    ["m-none", "m-tumble", "m-tumble-slow", "m-spin-fast"].forEach((c) => machine.classList.remove(c));
    machine.classList.add(`m-${motion}`);
    machine.classList.toggle("is-off", resolved.key === "off" || resolved.key === "unavailable");
    machine.classList.toggle("is-error", isError);
    machine.classList.toggle("is-done", resolved.phase === 3 && !doorOpen);
    machine.classList.toggle("is-paused", paused);
    machine.classList.toggle("door-open", !!doorOpen);
    machine.classList.toggle("has-power", !!cfg.power_entity);
    machine.classList.toggle("power-on", powerOn === null ? resolved.key !== "off" : powerOn);

    const art = root.querySelector(".art");
    art.setAttribute("data-body", ["white", "silver", "black"].includes(cfg.body_color) ? cfg.body_color : "white");

    this._renderScene(motion, medium);
    try {
      if (paused) art.pauseAnimations();
      else art.unpauseAnimations();
    } catch (e) { /* SMIL not supported */ }

    // LCD
    const lcd = this._lcdContent({ resolved, remainMin, totalMin, childLock, errorCode, paused });
    const lcdEl = root.querySelector(".lcd");
    lcdEl.innerHTML = lcdSvg(lcd.chars, lcd.colon);
    lcdEl.setAttribute("class", `lcd lcdm-${lcd.mode}`);
    root.querySelector(".ico-lock").classList.toggle("lit", !!doorLocked);
    root.querySelector(".ico-wifi").classList.toggle("lit", resolved.key !== "off" && resolved.key !== "unavailable");

    // knob position from course name
    let idx = 0;
    if (validCourse) {
      for (const ch of normalizeKey(validCourse)) idx = (idx * 31 + ch.charCodeAt(0)) % 12;
    }
    root.querySelector(".knob-mark").setAttribute("transform", `rotate(${-150 + idx * 25} 112 40)`);
    root.querySelectorAll(".tick").forEach((t) => t.classList.toggle("lit", validCourse && Number(t.dataset.i) === idx));

    // progress ring
    const ring = root.querySelector(".ring-bar");
    const track = root.querySelector(".ring-track");
    if (cfg.show_progress_ring && progress !== null && resolved.key !== "off") {
      ring.style.display = "";
      track.style.display = "";
      const dash = Math.max(0.001, (progress / 100) * RING_C);
      ring.setAttribute("stroke-dasharray", `${dash} ${RING_C}`);
      ring.style.opacity = progress > 0 ? "" : "0";
    } else {
      ring.style.display = "none";
      track.style.display = "none";
    }

    // phase stepper
    const phasesEl = root.querySelector(".phases");
    if (cfg.show_phase_lights) {
      phasesEl.style.display = "";
      const phase = resolved.phase === -1 ? (this._lastPhase ?? 0) : resolved.phase;
      phasesEl.innerHTML = PHASES.map((p, i) => {
        let st = "";
        if (phase !== null && phase !== undefined) {
          if (phase === 3 || i < phase) st = "done";
          else if (i === phase) st = resolved.running ? "current" : paused ? "current held" : "done";
        }
        return `<div class="phase ${st}"><span class="bar"><i></i></span><span class="plabel">${p}</span></div>`;
      }).join("");
    } else {
      phasesEl.style.display = "none";
    }

    // chips
    const chips = [];
    if (temperature && !["unknown", "unavailable"].includes(temperature)) chips.push({ icon: "mdi:thermometer", label: /\d/.test(String(temperature)) ? `${temperature}°` : titleCase(temperature) });
    if (spinSpeed && !["unknown", "unavailable"].includes(spinSpeed)) chips.push({ icon: "mdi:rotate-3d-variant", label: /\d/.test(String(spinSpeed)) ? `${spinSpeed} rpm` : titleCase(spinSpeed) });
    if (doorLocked) chips.push({ icon: "mdi:lock", label: "Door locked" });
    if (childLock) chips.push({ icon: "mdi:baby-face-outline", label: "Child lock" });
    if (totalMin) chips.push({ icon: "mdi:timer-outline", label: `${formatMinutes(totalMin)} total` });

    root.querySelector(".chips").innerHTML = chips
      .map((c) => `<span class="chip"><ha-icon icon="${c.icon}"></ha-icon>${c.label}</span>`)
      .join("");
  }
}

/* ---------------------------------------------------------------------- */
/*  Config editor (GUI)                                                   */
/* ---------------------------------------------------------------------- */

class LgWasherCardEditor extends HTMLElement {
  setConfig(config) {
    this._config = { ...config };
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    if (this._form) this._form.hass = hass;
  }

  _schema() {
    const entPicker = (name, domain, label, required) => ({
      name,
      required: !!required,
      selector: { entity: domain ? { domain } : {} },
      label,
    });
    return [
      { name: "name", required: false, selector: { text: {} }, label: "Card name" },
      entPicker("status_entity", "sensor", "Status / run-state entity", true),
      entPicker("remaining_time_entity", "sensor", "Remaining time entity"),
      entPicker("total_time_entity", "sensor", "Total cycle time entity"),
      entPicker("course_entity", "sensor", "Course / cycle name entity"),
      entPicker("temperature_entity", "sensor", "Water temperature entity"),
      entPicker("spin_speed_entity", "sensor", "Spin speed entity"),
      entPicker("door_lock_entity", "binary_sensor", "Door lock entity"),
      entPicker("door_open_entity", "binary_sensor", "Door open entity"),
      entPicker("child_lock_entity", "binary_sensor", "Child lock entity"),
      entPicker("error_entity", "sensor", "Error code entity"),
      entPicker("power_entity", "switch", "Power switch entity"),
      {
        name: "body_color",
        label: "Cabinet finish",
        selector: { select: { mode: "dropdown", options: [
          { value: "white", label: "White" },
          { value: "silver", label: "Silver / stainless" },
          { value: "black", label: "Black steel" },
        ] } },
      },
      { name: "show_progress_ring", selector: { boolean: {} }, label: "Show progress ring" },
      { name: "show_phase_lights", selector: { boolean: {} }, label: "Show phase indicator lights" },
    ];
  }

  _render() {
    if (!this._config) return;
    this.innerHTML = "";
    const form = document.createElement("ha-form");
    form.hass = this._hass;
    form.data = this._config;
    form.schema = this._schema();
    form.computeLabel = (s) => s.label || s.name;
    form.addEventListener("value-changed", (ev) => {
      this._config = ev.detail.value;
      this.dispatchEvent(new CustomEvent("config-changed", { detail: { config: this._config } }));
    });
    this._form = form;
    this.appendChild(form);
  }
}

/* ---------------------------------------------------------------------- */
/*  Styles                                                                */
/* ---------------------------------------------------------------------- */

const STYLE = `
:host {
  --lgw-wash: #3b8cf6;
  --lgw-rinse: #1fb8c9;
  --lgw-spin: #0ea5e9;
  --lgw-steam: #a86cf7;
  --lgw-cool: #34d399;
  --lgw-dry: #f59e0b;
  --lgw-done: #22c55e;
  --lgw-paused: #f5a623;
  --lgw-error: #ef4444;
  --lgw-neutral: var(--secondary-text-color, #90a0ab);
  --lgw-led: #ff9b4a;
}

ha-card {
  padding: 16px 16px 14px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* header */
.header { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; }
.title-wrap { display: flex; flex-direction: column; min-width: 0; }
.title { font-size: 1.05rem; font-weight: 600; color: var(--primary-text-color); line-height: 1.3; }
.course { font-size: .78rem; color: var(--secondary-text-color); min-height: 1em; }
.pct { font-size: 1.05rem; font-weight: 600; color: var(--lgw-active); font-variant-numeric: tabular-nums; }

/* machine */
.machine { width: min(250px, 80%); margin: 8px auto 4px; cursor: pointer; outline: none; -webkit-tap-highlight-color: transparent; }
.art { width: 100%; height: auto; display: block; overflow: visible; }
.art * { transform-box: view-box; }

/* cabinet finishes */
.s-body-a { stop-color: #fbfbfc; } .s-body-b { stop-color: #dcdfe3; }
.s-panel-a { stop-color: #f1f2f4; } .s-panel-b { stop-color: #dde0e4; }
.s-bezel-a { stop-color: #ffffff; } .s-bezel-b { stop-color: #cdd2d7; }
.art[data-body="silver"] .s-body-a { stop-color: #e1e4e7; }
.art[data-body="silver"] .s-body-b { stop-color: #9ea5ac; }
.art[data-body="silver"] .s-panel-a { stop-color: #d3d7db; }
.art[data-body="silver"] .s-panel-b { stop-color: #b1b7bd; }
.art[data-body="silver"] .s-bezel-a { stop-color: #eceef0; }
.art[data-body="silver"] .s-bezel-b { stop-color: #a3aab1; }
.art[data-body="black"] .s-body-a { stop-color: #4b5057; }
.art[data-body="black"] .s-body-b { stop-color: #1e2226; }
.art[data-body="black"] .s-panel-a { stop-color: #3c4148; }
.art[data-body="black"] .s-panel-b { stop-color: #272b30; }
.art[data-body="black"] .s-bezel-a { stop-color: #5a6067; }
.art[data-body="black"] .s-bezel-b { stop-color: #25292d; }

.edge { fill: none; stroke: rgba(0,0,0,.14); stroke-width: 1; }
.art[data-body="black"] .edge { stroke: rgba(255,255,255,.10); }
.seam { stroke: rgba(0,0,0,.14); stroke-width: 1; }
.art[data-body="black"] .seam { stroke: rgba(0,0,0,.5); }
.topgloss { stroke: rgba(255,255,255,.7); stroke-width: 1; stroke-linecap: round; }
.art[data-body="black"] .topgloss { stroke: rgba(255,255,255,.12); }
.foot { fill: #2a2e33; }

.drawer { fill: rgba(0,0,0,.035); }
.drawer-edge { fill: none; stroke: rgba(0,0,0,.14); }
.art[data-body="black"] .drawer-edge { stroke: rgba(0,0,0,.45); }
.drawer-slot { fill: rgba(0,0,0,.28); }

.knob-face { fill: #e7eaed; stroke: rgba(0,0,0,.12); }
.art[data-body="black"] .knob-face { fill: #33373c; }
.knob-mark { stroke: var(--lgw-active, #888); stroke-width: 2.4; stroke-linecap: round; transition: transform .6s ease; }
.machine.is-off .knob-mark { stroke: #9aa0a6; }
.tick { fill: rgba(0,0,0,.18); }
.art[data-body="black"] .tick { fill: rgba(255,255,255,.18); }
.tick.lit { fill: var(--lgw-active); }
.machine.is-off .tick.lit { fill: rgba(0,0,0,.18); }

.lcd-edge { fill: none; stroke: rgba(0,0,0,.4); }
.lcd-off polygon, .lcd-off circle { fill: rgba(255,155,74,.07); }
.lcd-on polygon, .lcd-on circle { fill: var(--lgw-led); }
.lcdm-dark .lcd-off polygon, .lcdm-dark .lcd-off circle { fill: rgba(255,255,255,.03); }
.lcdm-error .lcd-on polygon, .lcdm-error .lcd-on circle { fill: #ff4d4d; }
.lcdm-error .lcd-on { animation: lgw-blink 1s steps(2, jump-none) infinite; }
.lcdm-blink .lcd-on { animation: lgw-blink 1.2s steps(2, jump-none) infinite; }
.lcdm-run .lcd-colon { animation: lgw-blink 1s steps(2, jump-none) infinite; }
@keyframes lgw-blink { 0% { opacity: 1; } 100% { opacity: .15; } }

.lcd-icons g { fill: rgba(255,155,74,.1); stroke: rgba(255,155,74,.1); }
.lcd-icons g.lit { fill: var(--lgw-led); stroke: var(--lgw-led); }
.ico-lock rect { stroke: none; }
.ico-wifi circle { stroke: none; }

.pwr-bg { fill: rgba(0,0,0,.06); }
.art[data-body="black"] .pwr-bg { fill: rgba(0,0,0,.3); }
.pwr-ring { fill: none; stroke: rgba(0,0,0,.18); stroke-width: 1.2; }
.pwr-glyph { fill: none; stroke: #8a9199; stroke-width: 1.6; stroke-linecap: round; }
.machine.power-on .pwr-ring { stroke: var(--lgw-active); stroke-width: 1.6; filter: drop-shadow(0 0 2px var(--lgw-active)); }
.machine.power-on .pwr-glyph { stroke: var(--lgw-active); }
.machine.has-power .pwr { cursor: pointer; }

.hatch { fill: rgba(0,0,0,.04); stroke: rgba(0,0,0,.14); }

/* progress ring */
.ring-track { fill: none; stroke: rgba(0,0,0,.08); stroke-width: 3; }
.art[data-body="black"] .ring-track { stroke: rgba(255,255,255,.08); }
.ring-bar {
  fill: none;
  stroke: var(--lgw-active);
  stroke-width: 3.5;
  stroke-linecap: round;
  transition: stroke-dasharray .8s ease, stroke .4s ease;
}
.machine.is-paused .ring-bar { animation: lgw-breathe 1.6s ease-in-out infinite; }
.machine.is-error .ring-bar, .machine.is-error .ring-track { stroke: var(--lgw-error); animation: lgw-breathe 1s ease-in-out infinite; }
@keyframes lgw-breathe { 0%, 100% { opacity: 1; } 50% { opacity: .35; } }

/* opening + drum */
.gasket { fill: #2b2f34; }
.gasket-lip { fill: none; stroke: #3d4248; stroke-width: 4; }

.drum-rot { transform-origin: 150px 216px; }
.m-tumble .drum-rot { animation: lgw-rot 3.4s linear infinite; }
.m-tumble-slow .drum-rot { animation: lgw-rot 6s linear infinite; }
.m-spin-fast .drum-rot { animation: lgw-rot .36s linear infinite; }
@keyframes lgw-rot { to { transform: rotate(360deg); } }

.pile-rock { transform-origin: 150px 216px; animation: lgw-rock 3.4s ease-in-out infinite; }
.m-tumble-slow .pile-rock { animation-duration: 6s; }
@keyframes lgw-rock { 0%, 100% { transform: rotate(-3deg); } 50% { transform: rotate(7deg); } }

.spin-wrap { transform-origin: 150px 216px; animation: lgw-rot .36s linear infinite; }
.m-spin-fast .body { animation: lgw-shake .13s linear infinite; }
@keyframes lgw-shake {
  0% { transform: translate(0, 0); } 25% { transform: translate(.7px, -.4px); }
  50% { transform: translate(-.5px, .5px); } 75% { transform: translate(.4px, .6px); }
  100% { transform: translate(0, 0); }
}

/* water */
.water { transform-origin: 150px 216px; animation: lgw-slosh 3.4s ease-in-out infinite; }
.m-tumble-slow .water { animation-duration: 6s; }
@keyframes lgw-slosh { 0%, 100% { transform: rotate(-5deg); } 50% { transform: rotate(4deg); } }
.wave { fill: url(#lgw-water); }
.wave.back { opacity: .45; animation: lgw-wave 2.8s linear infinite reverse; }
.wave.front { opacity: .8; animation: lgw-wave 1.7s linear infinite; }
.water.rinse .wave { fill: #9fdcf0; }
.water.rinse .wave.front { opacity: .55; }
@keyframes lgw-wave { from { transform: translateX(0); } to { transform: translateX(-40px); } }
.bub { fill: rgba(255,255,255,.75); animation: lgw-rise 2.4s ease-in infinite; }
@keyframes lgw-rise {
  0% { transform: translateY(26px); opacity: 0; }
  25% { opacity: .9; }
  90% { opacity: .8; }
  100% { transform: translateY(-2px); opacity: 0; }
}
.foam { fill: rgba(255,255,255,.62); animation: lgw-foam 1.9s ease-in-out infinite; }
@keyframes lgw-foam { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-2px); } }

/* steam / heat */
.fog { fill: rgba(255,255,255,.14); animation: lgw-breathe 3s ease-in-out infinite; }
.wisp { fill: none; stroke: rgba(255,255,255,.55); stroke-width: 8; stroke-linecap: round; animation: lgw-wisp 3s ease-out infinite; }
@keyframes lgw-wisp {
  0% { transform: translateY(10px); opacity: 0; }
  30% { opacity: .9; }
  100% { transform: translateY(-70px); opacity: 0; }
}
.heat { animation: lgw-breathe 2.6s ease-in-out infinite; }

/* door */
.bezel-edge { fill: none; stroke: rgba(0,0,0,.14); stroke-width: 1; }
.art[data-body="black"] .bezel-edge { stroke: rgba(255,255,255,.08); }
.glint { fill: none; stroke: rgba(255,255,255,.6); stroke-width: 2.5; stroke-linecap: round; }
.glint.dim { stroke: rgba(255,255,255,.25); }
.handle { fill: rgba(0,0,0,.1); stroke: rgba(0,0,0,.08); }
.door-shade { fill: #000; opacity: 0; transition: opacity .6s ease; pointer-events: none; }
.door { transform-origin: 52px 216px; transition: transform .7s cubic-bezier(.4, 0, .2, 1); }
.machine.door-open .door { transform: translateX(-30px) scaleX(.2); }
.machine.door-open .door-shade { opacity: .3; }

/* done */
.done-mark { opacity: 0; transform-origin: 150px 216px; transform: scale(.6); transition: opacity .4s ease, transform .5s cubic-bezier(.3, 1.6, .5, 1); }
.done-bg { fill: var(--lgw-done); opacity: .92; }
.done-check { fill: none; stroke: #fff; stroke-width: 5; stroke-linecap: round; stroke-linejoin: round; stroke-dasharray: 40; stroke-dashoffset: 40; }
.machine.is-done .done-mark { opacity: 1; transform: scale(1); }
.machine.is-done .done-check { animation: lgw-check .5s ease forwards .3s; }
@keyframes lgw-check { to { stroke-dashoffset: 0; } }

.machine.is-paused * { animation-play-state: paused !important; }
.machine.is-off .art .body { filter: saturate(.85); }

/* status row */
.status-row { display: flex; align-items: center; gap: 10px; margin-top: 8px; }
.status-badge {
  width: 36px; height: 36px; border-radius: 50%; flex: none;
  display: flex; align-items: center; justify-content: center;
  color: var(--lgw-active);
  background: color-mix(in srgb, var(--lgw-active) 16%, transparent);
}
.status-badge ha-icon { --mdc-icon-size: 20px; }
.status-text { display: flex; flex-direction: column; min-width: 0; }
.status-label { font-size: .98rem; font-weight: 600; color: var(--primary-text-color); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.status-sub { font-size: .78rem; color: var(--secondary-text-color); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

/* phase stepper */
.phases { display: grid; grid-template-columns: repeat(4, 1fr); gap: 6px; margin-top: 12px; }
.phase { display: flex; flex-direction: column; gap: 5px; }
.phase .bar { position: relative; display: block; height: 4px; border-radius: 2px; overflow: hidden; background: var(--divider-color, rgba(127,127,127,.2)); }
.phase .bar i { position: absolute; inset: 0; transform: scaleX(0); transform-origin: left; background: var(--lgw-active); border-radius: 2px; transition: transform .6s ease; }
.phase.done .bar i { transform: scaleX(1); }
.phase.current .bar i { transform: scaleX(1); background: linear-gradient(90deg, var(--lgw-active) 0%, color-mix(in srgb, var(--lgw-active) 30%, transparent) 50%, var(--lgw-active) 100%); background-size: 200% 100%; animation: lgw-shimmer 1.6s linear infinite; }
.phase.current.held .bar i { animation: none; opacity: .6; }
@keyframes lgw-shimmer { from { background-position: 200% 0; } to { background-position: 0 0; } }
.plabel { font-size: .7rem; color: var(--secondary-text-color); text-align: center; letter-spacing: .02em; }
.phase.current .plabel { color: var(--lgw-active); font-weight: 600; }
.phase.done .plabel { color: var(--primary-text-color); }

/* chips */
.chips { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 12px; }
.chips:empty { display: none; }
.chip {
  display: inline-flex; align-items: center; gap: 4px;
  font-size: .72rem; color: var(--secondary-text-color);
  background: var(--secondary-background-color, rgba(127,127,127,.12));
  border-radius: 12px; padding: 3px 9px 3px 6px;
}
.chip ha-icon { --mdc-icon-size: 14px; }

@media (prefers-reduced-motion: reduce) {
  .machine * { animation-duration: 0s !important; animation-iteration-count: 1 !important; }
}
`;

customElements.define("lg-washer-card", LgWasherCard);
customElements.define("lg-washer-card-editor", LgWasherCardEditor);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "lg-washer-card",
  name: "LG Washer Card",
  description: "A realistic, animated card for LG (ThinQ) washing machines with a live drum, door lock and progress ring.",
  preview: true,
  documentationURL: "https://github.com/marsh4200/lg-washer-card",
});

// eslint-disable-next-line no-console
console.info(`%c LG-WASHER-CARD %c v${CARD_VERSION} `, "color:white;background:#3b82f6;font-weight:700;", "color:#3b82f6;background:transparent;font-weight:700;");
