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

const CARD_VERSION = "1.0.0";

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
/*  Seven-segment digit renderer                                          */
/* ---------------------------------------------------------------------- */

const SEG_MAP = {
  "0": "abcdef",
  "1": "bc",
  "2": "abged",
  "3": "abgcd",
  "4": "fgbc",
  "5": "afgcd",
  "6": "afgecd",
  "7": "abc",
  "8": "abcdefg",
  "9": "abcdfg",
  "-": "g",
  " ": "",
};

function sevenSegDigit(char) {
  const segs = SEG_MAP[char] ?? "";
  const letters = "abcdefg".split("");
  const spans = letters
    .map((l) => `<span class="seg seg-${l}${segs.includes(l) ? " on" : ""}"></span>`)
    .join("");
  return `<span class="digit">${spans}</span>`;
}

function sevenSegString(str) {
  return String(str)
    .split("")
    .map((ch) => (ch === ":" ? '<span class="colon"><i></i><i></i></span>' : sevenSegDigit(ch)))
    .join("");
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
      show_progress_ring: true,
      show_phase_lights: true,
      tap_action_more_info: true,
      ...config,
    };
    this._lastRenderKey = null;
    if (!this.shadowRoot) this.attachShadow({ mode: "open" });
    this._buildStaticDom();
  }

  set hass(hass) {
    this._hass = hass;
    if (!this._config) return;
    this._update();
  }

  getCardSize() {
    return 6;
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
    root.innerHTML = `
      <style>${STYLE}</style>
      <ha-card>
        <div class="header">
          <div class="title-wrap">
            <span class="title"></span>
            <span class="course"></span>
          </div>
          <button class="power-btn" title="Power" hidden>
            <svg viewBox="0 0 24 24" width="20" height="20"><path fill="currentColor" d="M13 3h-2v10h2V3m4.83 2.17-1.42 1.42A6.92 6.92 0 0 1 19 12a7 7 0 1 1-11.66-5.24L5.92 5.34A9 9 0 1 0 20 12a8.94 8.94 0 0 0-2.17-5.83Z"/></svg>
          </button>
        </div>

        <div class="machine" tabindex="0" role="button" aria-label="Washing machine status">
          <svg class="art" viewBox="0 0 300 300" part="art">
            <defs>
              <linearGradient id="bodyGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" class="body-stop-top"/>
                <stop offset="1" class="body-stop-bottom"/>
              </linearGradient>
              <radialGradient id="glassGrad" cx="0.35" cy="0.3" r="0.8">
                <stop offset="0" class="glass-stop-1"/>
                <stop offset="0.55" class="glass-stop-2"/>
                <stop offset="1" class="glass-stop-3"/>
              </radialGradient>
              <radialGradient id="bezelGrad" cx="0.5" cy="0.35" r="0.75">
                <stop offset="0" class="bezel-stop-1"/>
                <stop offset="1" class="bezel-stop-2"/>
              </radialGradient>
              <filter id="ringGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="3" result="blur"/>
                <feMerge>
                  <feMergeNode in="blur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
            </defs>

            <!-- cabinet -->
            <rect x="14" y="10" width="272" height="278" rx="20" fill="url(#bodyGrad)" class="cabinet"/>
            <rect x="14" y="10" width="272" height="278" rx="20" class="cabinet-edge"/>

            <!-- fascia strip -->
            <rect x="14" y="10" width="272" height="34" rx="20" class="fascia"/>
            <circle cx="34" cy="27" r="5" class="knob"/>
            <text x="270" y="31" text-anchor="end" class="brand">SMART WASH</text>

            <!-- phase lights -->
            <g class="phase-lights" transform="translate(46,27)"></g>

            <!-- door bezel -->
            <circle cx="150" cy="176" r="104" fill="url(#bezelGrad)" class="bezel"/>
            <circle cx="150" cy="176" r="104" class="bezel-ring"/>

            <!-- progress ring -->
            <circle cx="150" cy="176" r="112" class="progress-track"/>
            <circle cx="150" cy="176" r="112" class="progress-bar" filter="url(#ringGlow)"
                    transform="rotate(-90 150 176)"/>

            <!-- door assembly (perspective wrapper) -->
            <g class="door-hinge">
              <g class="door-swing">
                <circle cx="150" cy="176" r="92" fill="url(#glassGrad)" class="glass"/>
                <circle cx="150" cy="176" r="92" class="glass-rim"/>

                <!-- drum contents -->
                <g class="drum" style="transform-origin: 150px 176px;">
                  <circle cx="150" cy="176" r="80" class="drum-shade"/>
                  <g class="laundry">
                    <ellipse cx="122" cy="152" rx="26" ry="19" class="cloth cloth-1"/>
                    <ellipse cx="180" cy="160" rx="24" ry="18" class="cloth cloth-2"/>
                    <ellipse cx="148" cy="204" rx="30" ry="20" class="cloth cloth-3"/>
                    <ellipse cx="112" cy="196" rx="18" ry="14" class="cloth cloth-4"/>
                    <ellipse cx="188" cy="204" rx="16" ry="13" class="cloth cloth-5"/>
                  </g>
                  <g class="bubbles">
                    <circle cx="118" cy="176" r="4" class="bubble b1"/>
                    <circle cx="168" cy="140" r="3" class="bubble b2"/>
                    <circle cx="190" cy="180" r="5" class="bubble b3"/>
                    <circle cx="140" cy="222" r="3.5" class="bubble b4"/>
                    <circle cx="160" cy="196" r="2.5" class="bubble b5"/>
                    <circle cx="128" cy="210" r="2.5" class="bubble b6"/>
                  </g>
                  <g class="speed-lines">
                    <path d="M92 176 a58 58 0 0 1 20 -50" class="speed-line sl1"/>
                    <path d="M208 176 a58 58 0 0 1 -20 50" class="speed-line sl2"/>
                    <path d="M150 96 a80 80 0 0 1 55 30" class="speed-line sl3"/>
                  </g>
                </g>

                <circle cx="150" cy="176" r="92" class="glass-sheen"/>
              </g>
            </g>

            <!-- lock badge -->
            <g class="lock-badge" transform="translate(222,244)">
              <circle r="15" class="lock-badge-bg"/>
              <path class="lock-icon" d="M-5,-1 h10 v7 h-10 z M-3,-1 v-3 a3,3 0 0 1 6,0 v3" fill="none" stroke="currentColor" stroke-width="1.6"/>
            </g>

            <!-- checkmark burst for cycle complete -->
            <g class="done-burst" transform="translate(150,176)">
              <path d="M-18,0 L-6,14 L20,-16" class="done-check" fill="none" stroke-linecap="round" stroke-linejoin="round" stroke-width="8"/>
            </g>
          </svg>
        </div>

        <div class="readout">
          <div class="status-line">
            <ha-icon class="status-icon" icon="mdi:washing-machine"></ha-icon>
            <span class="status-label">Ready</span>
          </div>
          <div class="digital"></div>
        </div>

        <div class="chips"></div>
      </ha-card>
    `;

    root.querySelector(".machine").addEventListener("click", () => {
      if (this._config.tap_action_more_info) this._fire(this._config.status_entity);
    });
    root.querySelector(".power-btn").addEventListener("click", (e) => {
      e.stopPropagation();
      this._togglePower();
    });
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
    const errorCode = cfg.error_entity ? this._getState(cfg.error_entity)?.state : null;
    const powerOn = cfg.power_entity ? this._getState(cfg.power_entity)?.state === "on" : null;

    const renderKey = JSON.stringify([
      resolved.key,
      remainMin,
      totalMin,
      progress,
      doorLocked,
      doorOpen,
      childLock,
      course,
      temperature,
      spinSpeed,
      errorCode,
      powerOn,
      cfg.name,
    ]);
    if (tickOnly && renderKey === this._lastRenderKey) return;
    this._lastRenderKey = renderKey;

    const card = root.querySelector("ha-card");
    const colorVar = `var(--lgw-${resolved.color})`;
    card.style.setProperty("--lgw-active", colorVar);

    // header
    root.querySelector(".title").textContent = cfg.name;
    root.querySelector(".course").textContent = course ? titleCase(course) : "";
    const powerBtn = root.querySelector(".power-btn");
    if (cfg.power_entity) {
      powerBtn.hidden = false;
      powerBtn.classList.toggle("on", !!powerOn);
    } else {
      powerBtn.hidden = true;
    }

    // status line
    root.querySelector(".status-icon").setAttribute("icon", errorCode ? "mdi:alert-circle" : resolved.icon);
    root.querySelector(".status-label").textContent = errorCode ? `Error ${errorCode}` : resolved.label;

    // digital readout
    const digital = root.querySelector(".digital");
    if (resolved.key === "off") {
      digital.innerHTML = sevenSegString("--:--");
    } else if (childLock) {
      digital.innerHTML = sevenSegString(" lc ");
    } else {
      digital.innerHTML = sevenSegString(formatMinutes(remainMin));
    }

    // machine visuals
    const machine = root.querySelector(".machine");
    machine.classList.toggle("is-off", resolved.key === "off");
    machine.classList.toggle("is-error", resolved.color === "error");
    machine.classList.toggle("is-done", resolved.phase === 3);
    machine.classList.toggle("is-paused", resolved.color === "paused");
    machine.classList.toggle("door-open", !!doorOpen);

    const drum = root.querySelector(".drum");
    drum.classList.remove("anim-tumble", "anim-tumble-slow", "anim-spin-fast", "anim-none");
    drum.classList.add(`anim-${resolved.anim}`);

    // progress ring
    const ring = root.querySelector(".progress-bar");
    const track = root.querySelector(".progress-track");
    const r = 112;
    const circumference = 2 * Math.PI * r;
    ring.style.stroke = colorVar;
    if (cfg.show_progress_ring && progress !== null) {
      ring.style.display = "";
      track.style.display = "";
      const dash = (progress / 100) * circumference;
      ring.setAttribute("stroke-dasharray", `${dash} ${circumference}`);
    } else {
      ring.style.display = "none";
      track.style.display = "none";
    }

    // lock badge
    const lockBadge = root.querySelector(".lock-badge");
    lockBadge.style.display = doorLocked === null ? "none" : "";
    lockBadge.classList.toggle("locked", !!doorLocked);

    // phase lights
    if (cfg.show_phase_lights) {
      const g = root.querySelector(".phase-lights");
      g.style.display = "";
      g.innerHTML = PHASES.map((p, i) => {
        const litSolid = resolved.phase !== null && resolved.phase !== -1 && i <= resolved.phase;
        const litPulse = resolved.phase !== null && i === resolved.phase && resolved.running;
        const cls = ["phase-dot", litSolid ? "lit" : "", litPulse ? "pulse" : ""].filter(Boolean).join(" ");
        return `<circle cx="${i * 27}" cy="0" r="4" class="${cls}"></circle>`;
      }).join("");
    } else {
      root.querySelector(".phase-lights").style.display = "none";
    }

    // chips row
    const chips = [];
    if (course) chips.push({ icon: "mdi:tune-variant", label: titleCase(course) });
    if (temperature) chips.push({ icon: "mdi:thermometer", label: /\d/.test(String(temperature)) ? `${temperature}°` : titleCase(temperature) });
    if (spinSpeed) chips.push({ icon: "mdi:rotate-3d-variant", label: /\d/.test(String(spinSpeed)) ? `${spinSpeed} RPM` : titleCase(spinSpeed) });
    if (childLock) chips.push({ icon: "mdi:lock", label: "Child Lock" });
    if (totalMin) chips.push({ icon: "mdi:timer-outline", label: `${formatMinutes(totalMin)} total` });

    root.querySelector(".chips").innerHTML = chips
      .map(
        (c) => `<span class="chip"><ha-icon icon="${c.icon}"></ha-icon>${c.label}</span>`
      )
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
  --lgw-wash: #3b82f6;
  --lgw-rinse: #22c1c3;
  --lgw-spin: #06b6d4;
  --lgw-steam: #a855f7;
  --lgw-cool: #34d399;
  --lgw-dry: #f59e0b;
  --lgw-done: #22c55e;
  --lgw-paused: #f5a623;
  --lgw-error: #ef4444;
  --lgw-neutral: var(--secondary-text-color, #90a0ab);
  --lgw-led: #ff8a3d;
}

ha-card {
  padding: 16px 16px 14px;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  overflow: hidden;
}

.header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 4px;
}

.title-wrap { display: flex; flex-direction: column; }

.title {
  font-size: 1.05rem;
  font-weight: 600;
  color: var(--primary-text-color);
}

.course {
  font-size: 0.75rem;
  color: var(--secondary-text-color);
  min-height: 1em;
}

.power-btn {
  border: none;
  background: var(--secondary-background-color, rgba(127,127,127,.15));
  color: var(--lgw-neutral);
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex: none;
}
.power-btn.on {
  color: white;
  background: var(--lgw-wash);
}

.machine {
  position: relative;
  width: min(240px, 78%);
  margin: 4px auto 8px;
  cursor: pointer;
  outline: none;
}

.art { width: 100%; height: auto; display: block; overflow: visible; }

/* cabinet */
.body-stop-top { stop-color: #f6f7f9; }
.body-stop-bottom { stop-color: #dcdfe3; }
:host-context([theme-dark]) .body-stop-top,
@media (prefers-color-scheme: dark) {
  .body-stop-top { stop-color: #4b5158; }
  .body-stop-bottom { stop-color: #2c3036; }
}
.cabinet-edge { fill: none; stroke: rgba(0,0,0,0.08); stroke-width: 1; }
.fascia { fill: rgba(0,0,0,0.06); }
.knob { fill: var(--lgw-neutral); opacity: .55; }
.brand {
  font-size: 8px;
  font-weight: 700;
  letter-spacing: 2px;
  fill: var(--lgw-neutral);
  opacity: .55;
  font-family: system-ui, sans-serif;
}

/* bezel / door */
.bezel-stop-1 { stop-color: #ffffff; }
.bezel-stop-2 { stop-color: #b9bec4; }
.bezel { opacity: .9; }
.bezel-ring { fill: none; stroke: rgba(0,0,0,0.12); stroke-width: 2; }

.glass-stop-1 { stop-color: #4b5966; }
.glass-stop-2 { stop-color: #1a232b; }
.glass-stop-3 { stop-color: #05080b; }
.glass { transition: filter .4s ease; }
.glass-rim { fill: none; stroke: rgba(255,255,255,0.25); stroke-width: 2; }
.glass-sheen {
  fill: none;
  stroke: rgba(255,255,255,0.18);
  stroke-width: 10;
  stroke-dasharray: 90 400;
  stroke-linecap: round;
  transform: rotate(-40deg);
  transform-origin: 150px 176px;
  pointer-events: none;
}

.door-hinge { transform-origin: 58px 176px; }
.door-swing { transform-origin: 58px 176px; transition: transform .6s cubic-bezier(.4,0,.2,1); }
.machine.door-open .door-swing { transform: rotateY(58deg) translateX(-6px) scaleX(.86); }
.machine.door-open .glass { filter: brightness(0.4); }

/* progress ring */
.progress-track {
  fill: none;
  stroke: var(--divider-color, rgba(127,127,127,.25));
  stroke-width: 4;
}
.progress-bar {
  fill: none;
  stroke-width: 4;
  stroke-linecap: round;
  transition: stroke-dasharray .6s ease, stroke .4s ease;
}
.machine:not(.is-off) .progress-bar { animation: lgw-ring-pulse 2.4s ease-in-out infinite; }

@keyframes lgw-ring-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: .65; }
}

/* drum contents */
.drum { transform-box: fill-box; }
.drum-shade { fill: rgba(0,0,0,0.15); }
.cloth { opacity: .9; }
.cloth-1 { fill: #e0574f; }
.cloth-2 { fill: #4f8de0; }
.cloth-3 { fill: #e0c14f; }
.cloth-4 { fill: #7fd1c6; }
.cloth-5 { fill: #b97fd1; }

.bubble { fill: rgba(255,255,255,0.55); opacity: 0; }
.machine.is-off .bubble, .machine.is-done .bubble { opacity: 0 !important; }

.speed-lines { opacity: 0; }
.speed-line { fill: none; stroke: rgba(255,255,255,.55); stroke-width: 3; stroke-linecap: round; }

.anim-none .laundry, .anim-none .bubble { animation: none; }

.anim-tumble-slow { animation: lgw-tumble 6.5s ease-in-out infinite; }
.anim-tumble { animation: lgw-tumble 3.1s ease-in-out infinite; }
.anim-tumble .bubble { animation: lgw-bubble 2.4s ease-in-out infinite; }
.anim-tumble-slow .bubble { animation: lgw-bubble 3.6s ease-in-out infinite; }
.anim-tumble .bubble.b1, .anim-tumble-slow .bubble.b1 { animation-delay: 0s; }
.anim-tumble .bubble.b2, .anim-tumble-slow .bubble.b2 { animation-delay: .3s; }
.anim-tumble .bubble.b3, .anim-tumble-slow .bubble.b3 { animation-delay: .6s; }
.anim-tumble .bubble.b4, .anim-tumble-slow .bubble.b4 { animation-delay: .9s; }
.anim-tumble .bubble.b5, .anim-tumble-slow .bubble.b5 { animation-delay: 1.2s; }
.anim-tumble .bubble.b6, .anim-tumble-slow .bubble.b6 { animation-delay: 1.5s; }

.anim-spin-fast {
  animation: lgw-spin 0.45s linear infinite;
  filter: blur(0.6px);
}
.anim-spin-fast .speed-lines { opacity: 1; animation: lgw-flicker 0.45s linear infinite; }
.anim-spin-fast .bubble { opacity: 0; }
.anim-spin-fast .cloth { opacity: .45; }

@keyframes lgw-tumble {
  0%   { transform: rotate(0deg); }
  25%  { transform: rotate(48deg); }
  48%  { transform: rotate(-14deg); }
  70%  { transform: rotate(30deg); }
  100% { transform: rotate(0deg); }
}
@keyframes lgw-spin { to { transform: rotate(360deg); } }
@keyframes lgw-flicker { 0%,100% { opacity: .9; } 50% { opacity: .5; } }
@keyframes lgw-bubble {
  0%, 100% { opacity: 0; transform: translateY(2px) scale(.7); }
  50% { opacity: .8; transform: translateY(-3px) scale(1); }
}

/* state colour wash on the glass */
.machine:not(.is-off) .glass { filter: drop-shadow(0 0 0 transparent); }

/* lock badge */
.lock-badge { color: white; }
.lock-badge-bg { fill: var(--lgw-neutral); }
.lock-badge.locked .lock-badge-bg { fill: var(--lgw-active, var(--lgw-wash)); }

/* done burst */
.done-check {
  stroke: white;
  stroke-dasharray: 60;
  stroke-dashoffset: 60;
  opacity: 0;
}
.done-burst circle {
  opacity: 0;
}
.machine.is-done .done-burst {
  opacity: 1;
}
.machine.is-done .done-check {
  animation: lgw-check 0.6s ease forwards 0.15s;
}
@keyframes lgw-check {
  to { stroke-dashoffset: 0; opacity: 1; }
}
.machine.is-done .glass { filter: saturate(0.7); }
.machine:not(.is-done) .done-check { opacity: 0; }

.machine.is-error .bezel-ring { animation: lgw-alert 1s ease-in-out infinite; stroke: var(--lgw-error); stroke-width: 3; }
@keyframes lgw-alert { 0%,100% { opacity: .4; } 50% { opacity: 1; } }

.machine.is-off .art { filter: grayscale(0.85) brightness(0.92); }
.machine.is-paused .progress-bar { animation: lgw-ring-pulse 1s ease-in-out infinite; }

/* phase lights */
.phase-dot { fill: rgba(127,127,127,.35); transition: fill .3s ease; }
.phase-dot.lit { fill: var(--lgw-active, var(--lgw-wash)); }
.phase-dot.pulse { animation: lgw-dot-pulse 1.1s ease-in-out infinite; }
@keyframes lgw-dot-pulse { 0%,100% { opacity: 1; } 50% { opacity: .35; } }

/* readout */
.readout {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-top: 2px;
}
.status-line { display: flex; align-items: center; gap: 6px; min-width: 0; }
.status-icon { color: var(--lgw-active, var(--lgw-neutral)); flex: none; }
.status-label {
  font-size: 0.92rem;
  font-weight: 600;
  color: var(--primary-text-color);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.digital {
  display: flex;
  align-items: center;
  background: #101418;
  border-radius: 6px;
  padding: 4px 8px;
  flex: none;
}

/* 7-segment digits */
.digit { position: relative; width: 12px; height: 20px; margin: 0 1.5px; flex: none; }
.seg { position: absolute; background: rgba(255,138,61,0.08); border-radius: 1px; }
.seg.on { background: var(--lgw-led); box-shadow: 0 0 5px var(--lgw-led); }
.seg-a { top: 0;    left: 1.5px; width: 9px;  height: 2.4px; }
.seg-g { top: 8.8px; left: 1.5px; width: 9px;  height: 2.4px; }
.seg-d { top: 17.6px;left: 1.5px; width: 9px;  height: 2.4px; }
.seg-f { top: 1.5px; left: 0;     width: 2.4px; height: 8px; }
.seg-b { top: 1.5px; left: 9.6px; width: 2.4px; height: 8px; }
.seg-e { top: 10.5px;left: 0;     width: 2.4px; height: 8px; }
.seg-c { top: 10.5px;left: 9.6px; width: 2.4px; height: 8px; }
.colon { position: relative; width: 5px; height: 20px; flex: none; display: inline-block; }
.colon i { display: block; width: 2.4px; height: 2.4px; border-radius: 50%; background: var(--lgw-led); box-shadow: 0 0 5px var(--lgw-led); position: absolute; left: 1px; }
.colon i:first-child { top: 6px; }
.colon i:last-child { top: 12px; }

/* chips */
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 10px;
}
.chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 0.72rem;
  color: var(--secondary-text-color);
  background: var(--secondary-background-color, rgba(127,127,127,.12));
  border-radius: 12px;
  padding: 3px 8px 3px 6px;
}
.chip ha-icon { --mdc-icon-size: 14px; }
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
