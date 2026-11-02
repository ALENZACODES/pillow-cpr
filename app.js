/* Pillow CPR — app.js
   All client-side. Pose tracking (MediaPipe) runs locally; no video leaves the device.
   Sections: helpers · speech · metronome · compression signal processor · pose engine ·
             practice session + scoring + certificate · emergency mode · wiring        */
"use strict";

/* ================= helpers ================= */
const $ = (id) => document.getElementById(id);
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const now = () => performance.now();

const VIEWS = ["view-home", "view-setup", "view-practice", "view-results", "view-emergency"];
function showView(id) {
  VIEWS.forEach((v) => $(v).classList.toggle("active", v === id));
  window.scrollTo({ top: 0 });
}

/* ================= speech coach ================= */
const Coach = {
  enabled: true,
  lastSpokeAt: 0,
  minGapMs: 3200,
  supported: "speechSynthesis" in window,
  say(text, urgent = false) {
    if (!this.enabled || !this.supported) return;
    const t = now();
    if (!urgent && t - this.lastSpokeAt < this.minGapMs) return;
    try {
      if (urgent) speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 1.05;
      u.pitch = 1.0;
      speechSynthesis.speak(u);
      this.lastSpokeAt = t;
    } catch (e) { /* voice is a bonus; never break the session */ }
  },
  stop() { if (this.supported) { try { speechSynthesis.cancel(); } catch (e) {} } }
};

/* ================= metronome (WebAudio) ================= */
const Metronome = {
  ctx: null, timer: null, nextBeatAt: 0, beatMs: 60000 / 110, onBeat: null, running: false,
  ensureCtx() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) this.ctx = new AC();
    }
    if (this.ctx && this.ctx.state === "suspended") this.ctx.resume();
  },
  start(bpm = 110) {
    this.ensureCtx();
    if (!this.ctx) return false;
    this.stop();
    this.beatMs = 60000 / bpm;
    this.nextBeatAt = this.ctx.currentTime + 0.06;
    this.running = true;
    this.timer = setInterval(() => this.schedule(), 25);
    return true;
  },
  schedule() {
    if (!this.ctx) return;
    while (this.nextBeatAt < this.ctx.currentTime + 0.12) {
      this.click(this.nextBeatAt);
      const delayMs = Math.max(0, (this.nextBeatAt - this.ctx.currentTime) * 1000);
      if (this.onBeat) {
        const cb = this.onBeat;
        setTimeout(() => cb(), delayMs);
      }
      this.nextBeatAt += this.beatMs / 1000;
    }
  },
  click(t) {
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "square";
    osc.frequency.value = 1560;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.4, t + 0.004);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
    osc.connect(gain).connect(this.ctx.destination);
    osc.start(t); osc.stop(t + 0.06);
  },
  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null; this.running = false;
  }
};

/* ================= compression signal processor =================
   Camera path: each pose frame feeds the smoothed wrist height; a state machine
   finds down-strokes and releases. Demo/emergency tap path registers directly.
   Both paths land in registerCompression(), so scoring is identical.          */
class CompressionProcessor {
  constructor() { this.reset(); }

  reset() {
    this.smoothY = null;
    this.buffer = [];            // recent smoothed wrist Y values (for the "top" reference)
    this.state = "UP";           // UP | DOWN | RECOVERING
    this.maxDepth = 0;
    this.elbowAtBottom = null;
    this.records = [];           // {t, bpm, elbow, recoilFull, depthUnits}
    this.bottomTimes = [];
    this.lastDepthUnits = 0;
  }

  get count() { return this.records.length; }

  rollingBpm() {
    const ts = this.bottomTimes;
    if (ts.length < 2) return null;
    const intervals = [];
    for (let i = Math.max(1, ts.length - 5); i < ts.length; i++) intervals.push(ts[i] - ts[i - 1]);
    intervals.sort((a, b) => a - b);
    const median = intervals[Math.floor(intervals.length / 2)];
    return median > 0 ? Math.round(60000 / median) : null;
  }

  /* One camera frame. lm = MediaPipe pose landmarks (normalized coords). */
  feed(lm) {
    const lw = lm[15], rw = lm[16];
    const wristPts = [lw, rw].filter((p) => p && p.visibility > 0.4);
    if (!wristPts.length) return;
    const wristY = wristPts.reduce((s, p) => s + p.y, 0) / wristPts.length;
    const ls = lm[11], rs = lm[12];
    const shoulderWidth = Math.max(0.05, Math.hypot(ls.x - rs.x, ls.y - rs.y));

    this.smoothY = this.smoothY === null ? wristY : 0.5 * this.smoothY + 0.5 * wristY;
    this.buffer.push(this.smoothY);
    if (this.buffer.length > 90) this.buffer.shift();
    if (this.buffer.length < 20) return;

    const sorted = [...this.buffer].sort((a, b) => a - b);
    const topY = sorted[Math.floor(sorted.length * 0.1)];       // 10th percentile ≈ hands-at-rest height
    const depth = (this.smoothY - topY) / shoulderWidth;       // in shoulder-width units
    this.lastDepthUnits = depth;

    const elbow = elbowAngle(lm);

    if (this.state === "UP") {
      if (depth > 0.30) { this.state = "DOWN"; this.maxDepth = depth; this.elbowAtBottom = elbow; }
    } else if (this.state === "DOWN") {
      if (depth > this.maxDepth) { this.maxDepth = depth; this.elbowAtBottom = elbow; }
      if (depth < 0.22) this.state = "RECOVERING";
    } else if (this.state === "RECOVERING") {
      if (depth < 0.10) { this.completeStroke(true); this.state = "UP"; }
      else if (depth > 0.30) { this.completeStroke(false); this.state = "DOWN"; this.maxDepth = depth; this.elbowAtBottom = elbow; }
    }
  }

  completeStroke(recoilFull) {
    this.bottomTimes.push(now());
    this.records.push({
      t: now(),
      bpm: this.rollingBpm(),
      elbow: this.elbowAtBottom,
      recoilFull,
      depthUnits: this.maxDepth
    });
    this.maxDepth = 0;
    if (this.onCompression) this.onCompression(this.records[this.records.length - 1]);
  }

  /* Tap / spacebar path (demo mode, emergency fallback). */
  registerTap() {
    this.bottomTimes.push(now());
    const rec = {
      t: now(),
      bpm: this.rollingBpm(),
      elbow: 168 + Math.round(Math.random() * 10),       // a tapped demo assumes straight arms
      recoilFull: Math.random() > 0.08,
      depthUnits: 0.55
    };
    this.records.push(rec);
    if (this.onCompression) this.onCompression(rec);
  }
}

function elbowAngle(lm) {
  // Use the side whose elbow+wrist are most visible.
  const side = (lm[13].visibility + lm[15].visibility) >= (lm[14].visibility + lm[16].visibility)
    ? [lm[11], lm[13], lm[15]] : [lm[12], lm[14], lm[16]];
  const [s, e, w] = side;
  const v1 = { x: s.x - e.x, y: s.y - e.y };
  const v2 = { x: w.x - e.x, y: w.y - e.y };
  const dot = v1.x * v2.x + v1.y * v2.y;
  const m1 = Math.hypot(v1.x, v1.y), m2 = Math.hypot(v2.x, v2.y);
  if (!m1 || !m2) return null;
  return Math.round((Math.acos(clamp(dot / (m1 * m2), -1, 1)) * 180) / Math.PI);
}

/* Framing quality for the setup screen. */
function framing(lm) {
  const ls = lm[11], rs = lm[12], lw = lm[15], rw = lm[16];
  const shoulders = ls.visibility > 0.6 && rs.visibility > 0.6;
  const wrists = lw.visibility > 0.45 || rw.visibility > 0.45;
  const sw = Math.hypot(ls.x - rs.x, ls.y - rs.y);
  const fits = sw > 0.07 && sw < 0.5 && ls.y > 0.03 && ls.y < 0.8 && rs.y > 0.03 && rs.y < 0.8;
  return { shoulders, wrists, fits, all: shoulders && wrists && fits };
}

/* ================= camera + pose engine ================= */
const PoseEngine = {
  pose: null, stream: null, running: false, sending: false,
  onLandmarks: null,           // callback(landmarks) — routed by the active view
  drawTargets: [],             // [{video, canvas}] drawn when their view is active
  cameraError: null,

  videos() {
    return { setup: $("inputVideo"), practice: $("practiceVideo"), emergency: $("emgVideo") };
  },
  activeVideo() {
    if ($("view-practice").classList.contains("active")) return this.videos().practice;
    if ($("view-emergency").classList.contains("active")) return this.videos().emergency;
    return this.videos().setup;
  },
  activeCanvas() {
    if ($("view-practice").classList.contains("active")) return $("practiceCanvas");
    if ($("view-emergency").classList.contains("active")) return $("emgCanvas");
    return $("overlayCanvas");
  },

  async startCamera() {
    if (this.stream) return true;
    try {
      this.stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
        audio: false
      });
      Object.values(this.videos()).forEach((v) => { v.srcObject = this.stream; v.play().catch(() => {}); });
      return true;
    } catch (e) {
      this.cameraError = e && e.name ? e.name : "camera unavailable";
      return false;
    }
  },

  startPose() {
    if (this.running) return true;
    if (typeof Pose === "undefined") { this.cameraError = "pose library failed to load"; return false; }
    try {
      this.pose = new Pose({ locateFile: (f) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${f}` });
      this.pose.setOptions({
        modelComplexity: 0, smoothLandmarks: true,
        minDetectionConfidence: 0.5, minTrackingConfidence: 0.5
      });
      this.pose.onResults((res) => this.handleResults(res));
      this.running = true;
      this.loop();
      return true;
    } catch (e) {
      this.cameraError = "pose failed to start";
      return false;
    }
  },

  async loop() {
    if (!this.running) return;
    const v = this.activeVideo();
    if (v && v.readyState >= 2 && !this.sending) {
      this.sending = true;
      try { await this.pose.send({ image: v }); } catch (e) { /* transient */ }
      this.sending = false;
    }
    requestAnimationFrame(() => this.loop());
  },

  handleResults(res) {
    const canvas = this.activeCanvas();
    const video = this.activeVideo();
    if (canvas && video) {
      const ctx = canvas.getContext("2d");
      ctx.save();
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (res.poseLandmarks && typeof drawConnectors !== "undefined" && typeof POSE_CONNECTIONS !== "undefined") {
        drawConnectors(ctx, res.poseLandmarks, POSE_CONNECTIONS, { color: "rgba(255,255,255,0.65)", lineWidth: 3 });
        drawLandmarks(ctx, res.poseLandmarks, { color: "#d7263d", radius: 4 });
        // Emphasise the points the coach actually uses.
        [11, 12, 13, 14, 15, 16].forEach((i) => {
          const p = res.poseLandmarks[i];
          if (!p) return;
          ctx.beginPath();
          ctx.arc(p.x * canvas.width, p.y * canvas.height, 7, 0, Math.PI * 2);
          ctx.fillStyle = "#1f9d66";
          ctx.fill();
        });
      }
      ctx.restore();
    }
    if (res.poseLandmarks && this.onLandmarks) this.onLandmarks(res.poseLandmarks);
  }
};

/* ================= practice session ================= */
const Session = {
  active: false, mode: "camera", proc: new CompressionProcessor(),
  startedAt: 0, durationMs: 120000, timerInt: null, feedbackInt: null,
  ruleCooldowns: {}, praiseIdx: 0, demo: false,

  start(mode) {
    this.mode = mode;
    this.demo = mode === "demo";
    this.proc = new CompressionProcessor();
    this.proc.onCompression = (rec) => this.onCompression(rec);
    this.ruleCooldowns = {};
    this.active = true;
    this.startedAt = now();
    showView("view-practice");
    $("tapPad").hidden = !this.demo;
    $("practiceCamMsg").textContent = this.demo ? "Demo mode — no camera" : "Live — pose tracking on this device";
    this.setBanner("Press when you’re ready — aim for the green zone.", "");
    this.updateHud(null);
    Coach.say(this.demo ? "Demo mode. Tap for each compression." : "Session started. Start compressions when you're ready.");
    if ($("metroToggle").checked) Metronome.start(110);

    PoseEngine.onLandmarks = (lm) => {
      if (this.active && this.mode === "camera") this.proc.feed(lm);
    };

    this.timerInt = setInterval(() => this.tick(), 200);
    this.feedbackInt = setInterval(() => this.evaluate(false), 2500);
  },

  tick() {
    const left = Math.max(0, this.durationMs - (now() - this.startedAt));
    const s = Math.ceil(left / 1000);
    $("timerText").textContent = `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
    $("timerFill").style.width = `${(left / this.durationMs) * 100}%`;
    if (left <= 0) this.finish(false);
  },

  onCompression(rec) {
    this.updateHud(rec);
    this.evaluate(true);
  },

  updateHud(rec) {
    const bpm = this.proc.rollingBpm();
    $("countValue").textContent = this.proc.count;
    const bpmEl = $("bpmValue");
    if (bpm === null) {
      bpmEl.textContent = "—";
      bpmEl.className = "bpm-value";
      $("gaugeNeedle").classList.remove("show");
    } else {
      bpmEl.textContent = bpm;
      const inZone = bpm >= 100 && bpm <= 120;
      bpmEl.className = "bpm-value " + (inZone ? "in-zone" : "out-zone");
      const pct = clamp(((bpm - 60) / 100) * 100, 0, 100);
      const needle = $("gaugeNeedle");
      needle.style.left = pct + "%";
      needle.classList.add("show");
    }
    if (rec) {
      $("depthValue").textContent = rec.depthUnits < 0.38 ? "Light" : rec.depthUnits <= 0.8 ? "Good" : "Deep";
      const strokes = this.proc.records;
      const locked = strokes.filter((r) => r.elbow !== null && r.elbow >= 160).length;
      $("formValue").textContent = strokes.length ? Math.round((locked / strokes.length) * 100) + "%" : "—";
    }
  },

  setBanner(text, kind) {
    const b = $("feedbackBanner");
    b.textContent = text;
    b.className = "feedback-banner" + (kind ? " " + kind : "");
  },

  cooldownReady(rule, ms) {
    const t = now();
    if (this.ruleCooldowns[rule] && t - this.ruleCooldowns[rule] < ms) return false;
    this.ruleCooldowns[rule] = t;
    return true;
  },

  evaluate(fromCompression) {
    if (!this.active) return;
    const recs = this.proc.records;
    const last = recs[recs.length - 1];
    const bpm = this.proc.rollingBpm();

    if (last && last.elbow !== null && last.elbow < 150 && this.cooldownReady("elbow", 9000)) {
      this.setBanner("Lock your elbows — straight arms, shoulders over your hands.", "warn");
      Coach.say("Lock your elbows.");
      return;
    }
    const lastTwo = recs.slice(-2);
    if (lastTwo.length === 2 && lastTwo.every((r) => !r.recoilFull) && this.cooldownReady("recoil", 9000)) {
      this.setBanner("Let it come all the way up between pushes.", "warn");
      Coach.say("Let it come all the way up.");
      return;
    }
    if (bpm !== null && bpm < 95 && recs.length >= 3 && this.cooldownReady("faster", 8000)) {
      this.setBanner(`Faster — you’re at ${bpm}. Aim for 100 to 120.`, "bad");
      Coach.say("Faster.");
      return;
    }
    if (bpm !== null && bpm > 125 && this.cooldownReady("slower", 8000)) {
      this.setBanner(`Slow down a little — you’re at ${bpm}. Aim for 100 to 120.`, "warn");
      Coach.say("Slow down a little.");
      return;
    }
    if (bpm !== null && bpm >= 100 && bpm <= 120 && recs.length >= 4 && this.cooldownReady("praise", 12000)) {
      const praise = ["Good pace — keep going.", "That’s it. Strong and steady.", "Right in the zone. Keep it up."];
      const text = praise[this.praiseIdx++ % praise.length];
      this.setBanner(text, "good");
      Coach.say(text);
    }
  },

  finish(early) {
    if (!this.active) return;
    this.active = false;
    clearInterval(this.timerInt);
    clearInterval(this.feedbackInt);
    if ($("metroToggle").checked) Metronome.stop();
    Coach.stop();
    const elapsed = Math.min(this.durationMs, now() - this.startedAt);
    const scores = scoreSession(this.proc.records);
    renderResults(scores, this.proc.records, elapsed, this.demo, early);
    showView("view-results");
    Coach.enabled = $("voiceToggle").checked;
    if (Coach.enabled) Coach.say(`Session complete. Your overall score is ${scores.overall} out of 100.`);
  }
};

/* ================= scoring ================= */
function scoreSession(records) {
  const n = records.length;
  const intervals = [];
  for (let i = 1; i < records.length; i++) intervals.push(records[i].t - records[i - 1].t);
  const bpms = records.map((r) => r.bpm).filter((b) => b !== null);

  let rateScore = 0;
  if (bpms.length) {
    const inZone = bpms.filter((b) => b >= 100 && b <= 120).length;
    rateScore = Math.round((inZone / bpms.length) * 100);
  }
  let consistencyScore = 0;
  if (intervals.length >= 4) {
    const mean = intervals.reduce((a, b) => a + b, 0) / intervals.length;
    const sd = Math.sqrt(intervals.reduce((a, b) => a + (b - mean) ** 2, 0) / intervals.length);
    const cv = mean > 0 ? sd / mean : 1;
    consistencyScore = clamp(Math.round(100 - cv * 220), 0, 100);
  } else if (intervals.length > 0) {
    consistencyScore = 40;
  }
  let formScore = 0;
  if (n) {
    const locked = records.filter((r) => r.elbow !== null && r.elbow >= 160).length / n;
    const recoil = records.filter((r) => r.recoilFull).length / n;
    formScore = Math.round(((locked + recoil) / 2) * 100);
  }
  const overall = Math.round(0.4 * rateScore + 0.3 * consistencyScore + 0.3 * formScore);
  const avgBpm = bpms.length ? Math.round(bpms.reduce((a, b) => a + b, 0) / bpms.length) : null;
  const meanInterval = intervals.length ? Math.round(intervals.reduce((a, b) => a + b, 0) / intervals.length) : null;
  return { rateScore, consistencyScore, formScore, overall, avgBpm, meanInterval, n };
}

function renderResults(scores, records, elapsedMs, demo, early) {
  $("overallScore").textContent = scores.overall;
  $("rateScore").textContent = scores.rateScore;
  $("consistencyScore").textContent = scores.consistencyScore;
  $("formScore").textContent = scores.formScore;
  $("overallMessage").textContent =
    scores.n < 10 ? "A short taste — do a full 2 minutes for a score that means something." :
    scores.overall >= 85 ? "Lifesaver form. That’s the pace that saves people." :
    scores.overall >= 70 ? "Strong session. Small fixes and you’re in the zone throughout." :
    scores.overall >= 50 ? "Real progress. Watch the feedback cues and go again." :
    "Everyone starts here. The coach’s cues fix most of this in one more round.";
  $("rateDetail").textContent = scores.avgBpm
    ? `Average pace ${scores.avgBpm}/min — the zone is 100–120.`
    : "Not enough compressions to judge pace.";
  $("consistencyDetail").textContent = scores.meanInterval
    ? `Average gap between pushes: ${(scores.meanInterval / 1000).toFixed(2)}s. Steady beats bursty.`
    : "Not enough compressions to judge steadiness.";
  const lockedPct = records.length
    ? Math.round((records.filter((r) => r.elbow !== null && r.elbow >= 160).length / records.length) * 100) : 0;
  const recoilPct = records.length
    ? Math.round((records.filter((r) => r.recoilFull).length / records.length) * 100) : 0;
  $("formDetail").textContent = records.length
    ? `Arms locked ${lockedPct}% of pushes · full release ${recoilPct}%.`
    : "No compressions recorded.";
  const secs = Math.round(elapsedMs / 1000);
  $("sessionMeta").textContent =
    `${scores.n} compressions in ${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, "0")}` +
    (early ? " (session ended early)" : "") + (demo ? " · demo mode (tapped, no camera)" : " · tracked by webcam on this device");
  drawCertificate(scores, demo);
}

/* ================= certificate card ================= */
let lastScores = null, lastDemo = false;
function drawCertificate(scores, demo) {
  lastScores = scores; lastDemo = demo;
  const c = $("certCanvas"), ctx = c.getContext("2d");
  const W = c.width, H = c.height;
  const name = ($("certName").value || "A Future Lifesaver").trim();

  const grad = ctx.createLinearGradient(0, 0, W, H);
  grad.addColorStop(0, "#ffffff"); grad.addColorStop(1, "#fdf1f3");
  ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = "#d7263d"; ctx.lineWidth = 10; ctx.strokeRect(18, 18, W - 36, H - 36);
  ctx.strokeStyle = "#17202b"; ctx.lineWidth = 2; ctx.strokeRect(40, 40, W - 80, H - 80);

  // Pillow + pulse mark
  ctx.strokeStyle = "#d7263d"; ctx.lineWidth = 9;
  ctx.beginPath();
  ctx.roundRect(W / 2 - 90, 78, 180, 92, 42);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(W / 2 - 62, 124); ctx.lineTo(W / 2 - 22, 124); ctx.lineTo(W / 2 - 8, 100);
  ctx.lineTo(W / 2 + 12, 148); ctx.lineTo(W / 2 + 26, 124); ctx.lineTo(W / 2 + 62, 124);
  ctx.stroke();

  ctx.textAlign = "center";
  ctx.fillStyle = "#17202b";
  ctx.font = "700 34px 'Avenir Next','Segoe UI',sans-serif";
  ctx.fillText("PILLOW CPR — CERTIFICATE OF PRACTICE", W / 2, 228);
  ctx.font = "400 25px 'Avenir Next','Segoe UI',sans-serif";
  ctx.fillStyle = "#45536a";
  ctx.fillText("This card records that", W / 2, 292);
  ctx.font = "800 54px 'Avenir Next','Segoe UI',sans-serif";
  ctx.fillStyle = "#d7263d";
  ctx.fillText(name, W / 2, 362);
  ctx.font = "400 25px 'Avenir Next','Segoe UI',sans-serif";
  ctx.fillStyle = "#45536a";
  ctx.fillText("practiced hands-only CPR for 2 minutes — coached by webcam,", W / 2, 412);
  ctx.fillText("scored on rate, consistency and arm form.", W / 2, 450);

  const cols = [
    ["OVERALL", scores.overall], ["RATE", scores.rateScore],
    ["CONSISTENCY", scores.consistencyScore], ["ARM FORM", scores.formScore]
  ];
  cols.forEach(([label, val], i) => {
    const x = W / 2 + (i - 1.5) * 235;
    ctx.font = "800 64px 'Avenir Next','Segoe UI',sans-serif";
    ctx.fillStyle = i === 0 ? "#d7263d" : "#17202b";
    ctx.fillText(String(val), x, 572);
    ctx.font = "700 19px 'Avenir Next','Segoe UI',sans-serif";
    ctx.fillStyle = "#45536a";
    ctx.fillText(label + " / 100", x, 606);
  });

  const date = new Date().toLocaleDateString("en-CA", { year: "numeric", month: "long", day: "numeric" });
  ctx.font = "400 21px 'Avenir Next','Segoe UI',sans-serif";
  ctx.fillStyle = "#45536a";
  ctx.fillText(`${date} · ${scores.n} compressions${demo ? " · demo mode (tapped)" : ""}`, W / 2, 676);
  ctx.font = "italic 400 17px 'Avenir Next','Segoe UI',sans-serif";
  ctx.fillText("A practice card, not a certification. For the real credential, take a certified CPR course (heart.org).", W / 2, 716);
}

/* ================= emergency mode ================= */
const Emergency = {
  active: false, proc: new CompressionProcessor(), metroOn: false,

  enter() {
    this.active = true;
    this.proc = new CompressionProcessor();
    this.proc.onCompression = () => {
      $("emgCount").textContent = this.proc.count;
      if ($("emgCountToggle").checked && this.proc.count > 0 && this.proc.count % 10 === 0) {
        Coach.enabled = true;
        Coach.say(String(this.proc.count), true);
      }
    };
    $("emgCount").textContent = "0";
    showView("view-emergency");
    PoseEngine.startCamera().then(() => PoseEngine.startPose());
    PoseEngine.onLandmarks = (lm) => {
      if (this.active && $("emgCountToggle").checked) this.proc.feed(lm);
    };
    Coach.enabled = true;
    Coach.say("Call 911 now. Put the phone on speaker.", true);
  },
  exit() {
    this.active = false;
    this.metroOn = false;
    Metronome.stop();
    $("emgStartBtn").textContent = "Start metronome";
    $("emgStartBtn").classList.remove("on");
    Coach.stop();
  },
  toggleMetro() {
    if (this.metroOn) {
      Metronome.stop();
      this.metroOn = false;
      $("emgStartBtn").textContent = "Start metronome";
      $("emgStartBtn").classList.remove("on");
    } else {
      Metronome.onBeat = () => {
        const p = $("emgPulse");
        p.classList.add("beat");
        setTimeout(() => p.classList.remove("beat"), 110);
      };
      if (Metronome.start(110)) {
        this.metroOn = true;
        $("emgStartBtn").textContent = "Stop metronome";
        $("emgStartBtn").classList.add("on");
        Coach.say("Follow the beat. Push hard and fast.", true);
      }
    }
  }
};

/* ================= setup flow ================= */
const Setup = {
  stableFrames: 0,
  async enter() {
    showView("view-setup");
    this.stableFrames = 0;
    $("beginSessionBtn").disabled = true;
    $("camMessage").textContent = "Starting your camera…";
    const camOk = await PoseEngine.startCamera();
    if (!camOk) {
      $("camMessage").textContent = "Camera unavailable (" + (PoseEngine.cameraError || "blocked") + "). Use demo mode below — the coaching and scoring still work.";
      return;
    }
    $("camMessage").textContent = "Camera on. Get in position — checks turn green when you’re framed.";
    const poseOk = PoseEngine.startPose();
    if (!poseOk) {
      $("camMessage").textContent = "Pose tracking couldn’t load. Use demo mode below — the coaching and scoring still work.";
      return;
    }
    PoseEngine.onLandmarks = (lm) => {
      if (!$("view-setup").classList.contains("active")) return;
      const f = framing(lm);
      $("checkShoulders").classList.toggle("ok", f.shoulders);
      $("checkWrists").classList.toggle("ok", f.wrists);
      $("checkFraming").classList.toggle("ok", f.fits);
      this.stableFrames = f.all ? this.stableFrames + 1 : 0;
      if (this.stableFrames > 30) {
        $("beginSessionBtn").disabled = false;
        $("camMessage").textContent = "You’re framed. Hit Begin when you’re ready.";
      }
    };
  }
};

/* ================= wiring ================= */
document.addEventListener("DOMContentLoaded", () => {
  $("startPracticeBtn").addEventListener("click", () => Setup.enter());
  $("startEmergencyBtn").addEventListener("click", () => Emergency.enter());
  $("emergencyBtnTop").addEventListener("click", () => Emergency.enter());
  $("beginSessionBtn").addEventListener("click", () => Session.start("camera"));
  $("demoModeBtn").addEventListener("click", () => Session.start("demo"));
  $("endSessionBtn").addEventListener("click", () => Session.finish(true));
  $("tapPad").addEventListener("click", () => { if (Session.active && Session.demo) Session.proc.registerTap(); });
  $("voiceToggle").addEventListener("change", (e) => {
    Coach.enabled = e.target.checked;
    if (!Coach.enabled) Coach.stop();
  });
  $("metroToggle").addEventListener("change", (e) => {
    if (!Session.active) return;
    if (e.target.checked) {
      Metronome.onBeat = null;
      Metronome.start(110);
    } else Metronome.stop();
  });
  $("certName").addEventListener("input", () => { if (lastScores) drawCertificate(lastScores, lastDemo); });
  $("downloadCertBtn").addEventListener("click", () => {
    $("certCanvas").toBlob((blob) => {
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "pillow-cpr-practice-card.png";
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    });
  });
  $("againBtn").addEventListener("click", () => Setup.enter());
  $("emgStartBtn").addEventListener("click", () => Emergency.toggleMetro());
  $("emgTapPad").addEventListener("click", () => {
    if (Emergency.active && $("emgCountToggle").checked) Emergency.proc.registerTap();
  });
  document.querySelectorAll(".back-home").forEach((b) => b.addEventListener("click", () => {
    Emergency.exit();
    Coach.stop();
    showView("view-home");
  }));
  $("brandHome").addEventListener("click", (e) => {
    e.preventDefault();
    Emergency.exit();
    showView("view-home");
  });

  document.addEventListener("keydown", (e) => {
    if (e.code !== "Space") return;
    const tag = (e.target && e.target.tagName) || "";
    if (tag === "INPUT" || tag === "TEXTAREA") return;
    if ($("view-practice").classList.contains("active") && Session.active && Session.demo) {
      e.preventDefault();
      Session.proc.registerTap();
    } else if ($("view-emergency").classList.contains("active") && Emergency.active && $("emgCountToggle").checked) {
      e.preventDefault();
      Emergency.proc.registerTap();
    }
  });
});
