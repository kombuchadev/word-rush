/* =========================================================
   WORD RUSH — host screen for a 3-team longest-word game
   ========================================================= */

// 15 pre-built letter sets (10 unique letters each, 3–4 vowels so long words exist).
// Letter order is shuffled when shown, so the "hidden" word isn't given away.
// `words` = the longest words possible from each set, shown by the "Reveal Words" button.
const LETTER_SETS = [
  { letters: "STRAENILOP", words: ["PRELATIONS", "RELATIONS", "TRAPLINES"] },
  { letters: "COMPUTERSA", words: ["COMPUTERS", "MOUSETRAP", "SPECTRUM"] },
  { letters: "BLEATRINGS", words: ["STRINGABLE", "INTEGRALS", "TRIANGLES"] },
  { letters: "DREAMINGST", words: ["DREAMINGS", "STREAMING", "GRADIENT"] },
  { letters: "FLOWERINGS", words: ["FLOWERINGS", "REFLOWING", "FLOWING"] },
  { letters: "KINDLESORA", words: ["IRELANDS", "SLANDER", "SNORKEL"] },
  { letters: "PARCHEDOUS", words: ["PURCHASED", "CARDHOUSE", "POACHERS"] },
  { letters: "GRAVELYINO", words: ["OVERLAYING", "VOYAGER", "YEARLONG"] },
  { letters: "JUMPEDTOAR", words: ["ADOPTER", "JUMPER", "TEMPURA"] },
  { letters: "WHISPERANT", words: ["PANTHERS", "WHISPER"] },
  { letters: "QUIETLYARS", words: ["EQUALITY", "REALITY", "QUIETLY"] },
  { letters: "BOXINGAREL", words: ["REGIONAL", "RELAXING", "BEARING"] },
  { letters: "CLIMBERSTO", words: ["MICROBES", "CLIMBERS"] },
  { letters: "FABULOESTR", words: ["ABSOLUTE", "TROUBLES"] },
  { letters: "ZENITHARCO", words: ["REACTION", "CHARIOT"] },
];

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const SLOT_COUNT = 10;
const IDLE_HUE = 265;
const STORE_KEY = "wordrush.v1";

// up to 6 teams; a game starts with the first 3 (change count/names via the 👥 Teams panel)
const TEAM_DEFAULTS = [
  { name: "Team A", hue: 330 },
  { name: "Team B", hue: 195 },
  { name: "Team C", hue: 45 },
  { name: "Team D", hue: 140 },
  { name: "Team E", hue: 270 },
  { name: "Team F", hue: 15 },
];

/* ---------------------------------------------------------
   Sound engine — everything synthesized with Web Audio,
   so no audio files are needed.
   --------------------------------------------------------- */
const Sound = (() => {
  let ctx = null;
  let master = null;
  let muted = false;
  let noiseBuf = null;

  function ensure() {
    if (!ctx) {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain();
      master.gain.value = 0.7;
      master.connect(ctx.destination);
      noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const d = noiseBuf.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  }

  function tone({ freq, type = "sine", dur = 0.15, vol = 0.3, attack = 0.004, slideTo = null, when = 0 }) {
    if (muted) return;
    ensure();
    const t = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(g).connect(master);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  function noise({ dur = 0.05, vol = 0.3, freq = 2000, q = 8, type = "bandpass", sweepTo = null, when = 0 }) {
    if (muted) return;
    ensure();
    const t = ctx.currentTime + when;
    const src = ctx.createBufferSource();
    src.buffer = noiseBuf;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.Q.value = q;
    f.frequency.setValueAtTime(freq, t);
    if (sweepTo) f.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(master);
    src.start(t, Math.random() * 0.5);
    src.stop(t + dur + 0.05);
  }

  // pentatonic ladder for the letter landings
  const LADDER = [523, 587, 659, 784, 880, 1047, 1175, 1319, 1568, 1760];

  return {
    unlock: ensure,
    toggleMute() { muted = !muted; return muted; },
    isMuted: () => muted,

    // mechanical clock "tick" and "tock"
    tick(loud = false) {
      noise({ dur: 0.035, vol: loud ? 0.9 : 0.55, freq: 3200, q: 12 });
      tone({ freq: 2400, type: "square", dur: 0.02, vol: loud ? 0.12 : 0.06 });
    },
    tock(loud = false) {
      noise({ dur: 0.04, vol: loud ? 0.9 : 0.55, freq: 1700, q: 10 });
      tone({ freq: 1200, type: "square", dur: 0.02, vol: loud ? 0.12 : 0.06 });
    },
    // warning beep for the final 10 seconds, climbing in pitch
    warn(secondsLeft) {
      const f = 660 + (10 - secondsLeft) * 70;
      tone({ freq: f, type: "triangle", dur: 0.18, vol: secondsLeft <= 5 ? 0.35 : 0.2 });
    },
    heartbeat() {
      tone({ freq: 90, slideTo: 45, type: "sine", dur: 0.18, vol: 0.7 });
      tone({ freq: 80, slideTo: 40, type: "sine", dur: 0.16, vol: 0.5, when: 0.2 });
    },
    reelClick() {
      tone({ freq: 1500 + Math.random() * 600, type: "square", dur: 0.018, vol: 0.04 });
    },
    land(i) {
      const f = LADDER[i % LADDER.length];
      tone({ freq: f, type: "triangle", dur: 0.35, vol: 0.28 });
      tone({ freq: f * 2, type: "sine", dur: 0.2, vol: 0.08 });
      noise({ dur: 0.06, vol: 0.25, freq: 800, q: 2 });
    },
    whoosh() {
      noise({ dur: 0.6, vol: 0.5, freq: 300, sweepTo: 5000, q: 1.5 });
    },
    go() {
      [523, 659, 784, 1047].forEach((f, i) =>
        tone({ freq: f, type: "square", dur: 0.25, vol: 0.12, when: i * 0.08 })
      );
      tone({ freq: 1047, type: "triangle", dur: 0.7, vol: 0.25, when: 0.32 });
    },
    timesUp() {
      // low buzzer
      tone({ freq: 140, slideTo: 90, type: "sawtooth", dur: 1.1, vol: 0.35, attack: 0.01 });
      tone({ freq: 147, slideTo: 92, type: "sawtooth", dur: 1.1, vol: 0.25, attack: 0.01 });
      // alarm-clock bell ringing
      for (let i = 0; i < 16; i++) {
        tone({ freq: i % 2 ? 1760 : 1480, type: "square", dur: 0.06, vol: 0.09, when: 0.05 + i * 0.07 });
      }
      noise({ dur: 0.9, vol: 0.35, freq: 6000, q: 0.7, when: 0.02 });
    },
    point(up = true) {
      tone({ freq: up ? 880 : 440, slideTo: up ? 1320 : 300, type: "triangle", dur: 0.15, vol: 0.2 });
    },
    fanfare() {
      const notes = [523, 659, 784, 1047, 784, 1047, 1319];
      notes.forEach((f, i) => tone({ freq: f, type: "square", dur: 0.3, vol: 0.12, when: i * 0.13 }));
      tone({ freq: 1568, type: "triangle", dur: 1.2, vol: 0.25, when: notes.length * 0.13 });
    },
  };
})();

/* ---------------------------------------------------------
   DOM
   --------------------------------------------------------- */
const $ = (id) => document.getElementById(id);
const root = document.documentElement;
const els = {
  stage: $("stage"),
  flash: $("flash"),
  roundPill: $("roundPill"),
  timer: $("timer"),
  timerNum: $("timerNum"),
  timerLabel: $("timerLabel"),
  reelBar: $("reelBar"),
  hint: $("hint"),
  nextBtn: $("nextBtn"),
  gameOverBtn: $("gameOverBtn"),
  pauseBtn: $("pauseBtn"),
  addTimeBtn: $("addTimeBtn"),
  skipBtn: $("skipBtn"),
  revealBtn: $("revealBtn"),
  reveal: $("reveal"),
  revealList: $("revealList"),
  teams: $("teams"),
  timesUp: $("timesUp"),
  gameOver: $("gameOver"),
  winnerText: $("winnerText"),
  muteBtn: $("muteBtn"),
  fullBtn: $("fullBtn"),
  settingsBtn: $("settingsBtn"),
  settings: $("settings"),
  closeSettings: $("closeSettings"),
  durationSel: $("durationSel"),
  roundsSel: $("roundsSel"),
  shuffleSets: $("shuffleSets"),
  resetBtn: $("resetBtn"),
  resetFromOver: $("resetFromOver"),
};

/* ---------------------------------------------------------
   State (persisted so a page refresh doesn't lose the game)
   --------------------------------------------------------- */
const state = {
  phase: "idle",      // idle | spinning | running | paused | ended
  roundsPlayed: 0,
  order: LETTER_SETS.map((_, i) => i),
  duration: 30,
  totalRounds: 10,
  shuffle: false,
  teams: TEAM_DEFAULTS.slice(0, 3).map((t) => ({ name: t.name, score: 0 })),
  endAt: 0,
  remainingMs: 30000,
  lastSec: null,
  lastHalf: null,
};

function save() {
  const { roundsPlayed, order, duration, totalRounds, shuffle, teams } = state;
  localStorage.setItem(STORE_KEY, JSON.stringify({ roundsPlayed, order, duration, totalRounds, shuffle, teams }));
}

function load() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORE_KEY));
    if (saved) Object.assign(state, saved);
  } catch { /* ignore corrupt storage */ }
}

/* ---------------------------------------------------------
   Helpers
   --------------------------------------------------------- */
function shuffled(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function freshOrder() {
  const order = LETTER_SETS.map((_, i) => i);
  return state.shuffle ? shuffled(order) : order;
}

function setHue(h) { root.style.setProperty("--hue", h); }
function setProgress(p) { root.style.setProperty("--progress", Math.max(0, Math.min(1, p))); }

function retrigger(el, cls) {
  el.classList.remove(cls);
  void el.offsetWidth; // force reflow so the CSS animation restarts
  el.classList.add(cls);
}

function flash(kind = "pulse") {
  els.flash.className = "flash";
  void els.flash.offsetWidth;
  els.flash.classList.add(kind);
}

/* ---------------------------------------------------------
   Reels
   --------------------------------------------------------- */
const slots = [];

function buildReels() {
  els.reelBar.innerHTML = "";
  for (let i = 0; i < SLOT_COUNT; i++) {
    const slot = document.createElement("div");
    slot.className = "slot";
    slot.style.setProperty("--slot-hue", (i * 36 + 300) % 360);
    const ch = document.createElement("span");
    ch.className = "ch";
    ch.textContent = "?";
    slot.appendChild(ch);
    els.reelBar.appendChild(slot);
    slots.push({ el: slot, ch });
  }
}

function spinReels(letters) {
  return new Promise((resolve) => {
    const start = performance.now();
    let landed = 0;

    // rainbow-cycle the whole UI while the reels spin
    let hue = IDLE_HUE;
    const hueLoop = () => {
      if (landed >= SLOT_COUNT) return;
      hue = (hue + 4) % 360;
      setHue(hue);
      requestAnimationFrame(hueLoop);
    };
    requestAnimationFrame(hueLoop);

    slots.forEach((s, i) => {
      s.el.className = "slot spinning";
      const decelAt = start + 450 + i * 210; // each slot starts slowing a bit after the previous one
      let delay = 38;

      const step = () => {
        const now = performance.now();
        if (now >= decelAt) delay *= 1.19;

        if (delay > 300) {
          // final letter lands
          s.ch.textContent = letters[i];
          s.el.className = "slot landed";
          s.ch.animate(
            [{ transform: "translateY(-80%)", opacity: 0 }, { transform: "translateY(0)", opacity: 1 }],
            { duration: 220, easing: "cubic-bezier(.2,1.6,.4,1)" }
          );
          Sound.land(i);
          landed++;
          if (landed === SLOT_COUNT) resolve();
          return;
        }

        let next;
        do { next = ALPHABET[Math.floor(Math.random() * 26)]; } while (next === s.ch.textContent);
        s.ch.textContent = next;
        s.ch.animate(
          [{ transform: "translateY(-60%)", opacity: 0.2 }, { transform: "translateY(0)", opacity: 1 }],
          { duration: Math.min(delay, 180), easing: "ease-out" }
        );
        if (delay > 110) s.el.classList.add("slow");

        // only the left-most still-spinning slot clicks, so it sounds like one machine slowing down
        if (i === landed) Sound.reelClick();

        setTimeout(step, delay);
      };
      step();
    });
  });
}

function celebrateLetters() {
  slots.forEach((s, i) => setTimeout(() => retrigger(s.el, "wiggle"), i * 55));
}

/* ---------------------------------------------------------
   Timer
   --------------------------------------------------------- */
function startTimer(ms) {
  state.phase = "running";
  state.endAt = performance.now() + ms;
  state.lastSec = null;
  state.lastHalf = null;
  els.timerLabel.textContent = "seconds";
  updateControls();
  requestAnimationFrame(timerLoop);
}

function timerLoop(now) {
  if (state.phase !== "running") return;

  const remaining = Math.max(0, state.endAt - now);
  state.remainingMs = remaining;
  const p = Math.min(1, remaining / (state.duration * 1000));
  setProgress(p);
  setHue(Math.round(140 * p)); // green -> yellow -> orange -> red

  const sec = Math.ceil(remaining / 1000);
  if (sec !== state.lastSec) {
    state.lastSec = sec;
    els.timerNum.textContent = sec;
    retrigger(els.timerNum, "tick");
    if (sec > 0) {
      sec % 2 ? Sound.tock(sec <= 10) : Sound.tick(sec <= 10);
      if (sec <= 10) Sound.warn(sec);
      if (sec <= 5) {
        Sound.heartbeat();
        flash("pulse");
      }
    }
    els.timer.classList.toggle("danger", sec <= 5 && sec > 0);
  }

  // in the final 10 seconds the clock ticks twice as fast
  const half = Math.ceil(remaining / 500);
  if (half !== state.lastHalf) {
    const isHalfBeat = half % 2 === 1;
    if (state.lastHalf !== null && sec <= 10 && sec > 0 && isHalfBeat) Sound.tick(true);
    state.lastHalf = half;
  }

  if (remaining <= 0) return timeUp();
  requestAnimationFrame(timerLoop);
}

function timeUp() {
  state.phase = "ended";
  setProgress(0);
  setHue(0);
  els.timerNum.textContent = "0";
  els.timerLabel.textContent = "time's up";
  els.timer.classList.remove("danger");
  Sound.timesUp();
  flash("pulse");
  retrigger(els.stage, "shake");
  showOverlay(els.timesUp, 2800);
  updateControls();
}

function togglePause() {
  if (state.phase === "running") {
    state.phase = "paused";
    state.remainingMs = Math.max(0, state.endAt - performance.now());
    els.timerLabel.textContent = "paused";
    els.timer.classList.remove("danger");
  } else if (state.phase === "paused") {
    Sound.unlock();
    startTimer(state.remainingMs);
  }
  updateControls();
}

function addTime() {
  if (state.phase === "running") state.endAt += 10000;
  else if (state.phase === "paused") state.remainingMs += 10000;
  else return;
  Sound.point(true);
  els.timer.classList.remove("danger");
  if (state.phase === "paused") els.timerNum.textContent = Math.ceil(state.remainingMs / 1000);
}

function endNow() {
  if (state.phase === "running") state.endAt = performance.now();
  else if (state.phase === "paused") timeUp();
}

/* ---------------------------------------------------------
   Rounds
   --------------------------------------------------------- */
async function nextRound() {
  if (state.phase === "spinning" || state.phase === "running" || state.phase === "paused") return;
  Sound.unlock();

  if (state.roundsPlayed >= LETTER_SETS.length) {
    showGameOver();
    return;
  }

  hideOverlay(els.timesUp);
  hideOverlay(els.reveal);
  // a fresh game picks up the "shuffle set order" setting even if it was ticked after the last reset
  if (state.roundsPlayed === 0) state.order = freshOrder();
  const setIndex = state.order[state.roundsPlayed % state.order.length];
  const letters = shuffled(LETTER_SETS[setIndex].letters.split(""));
  state.roundsPlayed++;
  save();

  state.phase = "spinning";
  els.roundPill.textContent = roundLabel();
  retrigger(els.roundPill, "bump");
  els.hint.classList.remove("show");
  els.timerNum.textContent = state.duration;
  els.timerLabel.textContent = "get ready";
  setProgress(1);
  updateControls();

  Sound.whoosh();
  flash("white");
  await spinReels(letters);

  Sound.go();
  celebrateLetters();
  els.hint.classList.add("show");
  els.timerLabel.textContent = "GO!";
  setTimeout(() => startTimer(state.duration * 1000), 450);
}

function roundLabel() {
  const n = state.roundsPlayed;
  return n > state.totalRounds ? `Bonus Round ${n - state.totalRounds}` : `Round ${n} / ${state.totalRounds}`;
}

function updateControls() {
  const p = state.phase;
  const busy = p === "spinning" || p === "running" || p === "paused";
  els.nextBtn.disabled = busy;
  const label = els.nextBtn.querySelector(".big-btn-text");
  // after the main rounds, the host decides each time: one more round, or end the game
  const inExtras = state.roundsPlayed >= state.totalRounds;
  const outOfSets = state.roundsPlayed >= LETTER_SETS.length;
  if (state.roundsPlayed === 0) label.textContent = "Start Round 1";
  else if (inExtras) label.textContent = `🎲 One More Round (${state.roundsPlayed + 1})`;
  else label.textContent = `Next Round → ${state.roundsPlayed + 1}`;
  els.nextBtn.hidden = outOfSets;
  els.gameOverBtn.hidden = !inExtras;
  els.gameOverBtn.disabled = busy;

  els.pauseBtn.disabled = !(p === "running" || p === "paused");
  els.pauseBtn.textContent = p === "paused" ? "▶ Resume" : "⏸ Pause";
  els.addTimeBtn.disabled = !(p === "running" || p === "paused");
  els.skipBtn.disabled = !(p === "running" || p === "paused");
  els.revealBtn.disabled = !(currentSet() && (p === "ended" || p === "idle"));
}

/* ---------------------------------------------------------
   Reveal the longest possible words for the current set
   --------------------------------------------------------- */
function currentSet() {
  if (state.roundsPlayed === 0) return null;
  return LETTER_SETS[state.order[(state.roundsPlayed - 1) % state.order.length]];
}

function revealWords() {
  const set = currentSet();
  if (!set || els.revealBtn.disabled) return;
  Sound.unlock();
  hideOverlay(els.timesUp);

  const words = [...set.words].sort((a, b) => b.length - a.length);
  els.revealList.innerHTML = "";
  words.forEach((word, w) => {
    const row = document.createElement("div");
    row.className = "reveal-row";
    row.style.animationDelay = `${w * 0.45}s`;
    const tiles = [...word]
      .map((ch, i) => `<span class="rtile" style="animation-delay:${w * 0.45 + 0.15 + i * 0.04}s">${ch}</span>`)
      .join("");
    row.innerHTML = `<div class="rtiles">${tiles}</div><div class="rlen">${word.length}<small>letters</small></div>`;
    els.revealList.appendChild(row);
    setTimeout(() => Sound.land(Math.min(9, word.length - 1)), w * 450 + 150);
  });

  showOverlay(els.reveal);
}

els.revealBtn.addEventListener("click", revealWords);
els.reveal.addEventListener("click", () => hideOverlay(els.reveal));

/* ---------------------------------------------------------
   Overlays & celebration
   --------------------------------------------------------- */
let overlayTimer = null;
function showOverlay(el, autoHideMs) {
  el.classList.remove("show");
  void el.offsetWidth;
  el.classList.add("show");
  clearTimeout(overlayTimer);
  if (autoHideMs) overlayTimer = setTimeout(() => hideOverlay(el), autoHideMs);
}
function hideOverlay(el) { el.classList.remove("show"); }

els.timesUp.addEventListener("click", () => hideOverlay(els.timesUp));
els.gameOver.addEventListener("click", () => hideOverlay(els.gameOver));

function confetti(count = 140) {
  const colors = ["#ff4d8d", "#ffd23f", "#3ee6c1", "#4d9bff", "#b86bff", "#ff8a3d"];
  for (let i = 0; i < count; i++) {
    const c = document.createElement("div");
    c.className = "confetti";
    c.style.left = Math.random() * 100 + "vw";
    c.style.background = colors[i % colors.length];
    c.style.animationDuration = 2.2 + Math.random() * 2.5 + "s";
    c.style.animationDelay = Math.random() * 0.8 + "s";
    c.style.borderRadius = Math.random() > 0.5 ? "50%" : "3px";
    document.body.appendChild(c);
    setTimeout(() => c.remove(), 6000);
  }
}

function showGameOver() {
  const max = Math.max(...state.teams.map((t) => t.score));
  const winners = state.teams.filter((t) => t.score === max);
  els.winnerText.textContent =
    winners.length === 1
      ? `🏆 ${winners[0].name} wins with ${max} point${max === 1 ? "" : "s"}!`
      : `🤝 It's a tie between ${winners.map((w) => w.name).join(" & ")} (${max} pts)!`;
  setHue(IDLE_HUE);
  Sound.fanfare();
  confetti();
  showOverlay(els.gameOver);
}

/* ---------------------------------------------------------
   Teams
   --------------------------------------------------------- */
function renderTeams() {
  els.teams.innerHTML = "";
  els.teams.style.setProperty("--team-count", state.teams.length);
  state.teams.forEach((team, i) => {
    const card = document.createElement("div");
    card.className = "team";
    card.style.setProperty("--team", TEAM_DEFAULTS[i].hue);
    card.innerHTML = `
      <button class="team-btn minus" title="−1 (Shift+${i + 1})">−</button>
      <div class="team-name" contenteditable="true" spellcheck="false"></div>
      <div class="team-score">${team.score}</div>
      <button class="team-btn plus" title="+1 (${i + 1})">+</button>`;
    const nameEl = card.querySelector(".team-name");
    nameEl.textContent = team.name;
    nameEl.addEventListener("blur", () => {
      team.name = nameEl.textContent.trim() || TEAM_DEFAULTS[i].name;
      nameEl.textContent = team.name;
      save();
    });
    nameEl.addEventListener("keydown", (e) => {
      if (e.key === "Enter") { e.preventDefault(); nameEl.blur(); }
    });
    card.querySelector(".plus").addEventListener("click", () => changeScore(i, 1));
    card.querySelector(".minus").addEventListener("click", () => changeScore(i, -1));
    els.teams.appendChild(card);
  });
  markLeader();
}

function changeScore(i, delta) {
  Sound.unlock();
  const team = state.teams[i];
  team.score = Math.max(0, team.score + delta);
  const scoreEl = els.teams.children[i].querySelector(".team-score");
  scoreEl.textContent = team.score;
  retrigger(scoreEl, "pop");
  Sound.point(delta > 0);
  markLeader();
  save();
}

function markLeader() {
  const max = Math.max(...state.teams.map((t) => t.score));
  const leaders = state.teams.filter((t) => t.score === max).length;
  [...els.teams.children].forEach((card, i) => {
    card.classList.toggle("leader", max > 0 && leaders === 1 && state.teams[i].score === max);
  });
}

/* ---------------------------------------------------------
   Settings, reset, misc controls
   --------------------------------------------------------- */
function openSettings(open) {
  els.settings.classList.toggle("open", open);
  els.settings.setAttribute("aria-hidden", String(!open));
}

function resetGame() {
  if (state.phase === "spinning") return; // let the reels finish first
  state.roundsPlayed = 0;
  state.order = freshOrder();
  state.teams.forEach((t) => (t.score = 0));
  state.phase = "idle";
  save();
  hideOverlay(els.gameOver);
  hideOverlay(els.timesUp);
  slots.forEach((s) => { s.el.className = "slot"; s.ch.textContent = "?"; });
  els.roundPill.textContent = "Ready?";
  els.timerNum.textContent = state.duration;
  els.timerLabel.textContent = "seconds";
  els.hint.classList.remove("show");
  els.timer.classList.remove("danger");
  setHue(IDLE_HUE);
  setProgress(1);
  renderTeams();
  updateControls();
}

els.nextBtn.addEventListener("click", nextRound);
els.gameOverBtn.addEventListener("click", () => { Sound.unlock(); showGameOver(); });
els.pauseBtn.addEventListener("click", togglePause);
els.addTimeBtn.addEventListener("click", addTime);
els.skipBtn.addEventListener("click", endNow);
els.settingsBtn.addEventListener("click", () => openSettings(!els.settings.classList.contains("open")));
els.closeSettings.addEventListener("click", () => openSettings(false));
els.resetFromOver.addEventListener("click", (e) => { e.stopPropagation(); resetGame(); });
els.resetBtn.addEventListener("click", () => {
  if (confirm("Reset the game? Scores and round progress will be cleared.")) {
    resetGame();
    openSettings(false);
  }
});

els.muteBtn.addEventListener("click", () => {
  const muted = Sound.toggleMute();
  els.muteBtn.textContent = muted ? "🔇" : "🔊";
});

els.fullBtn.addEventListener("click", toggleFullscreen);
function toggleFullscreen() {
  if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
  else document.exitFullscreen?.();
}

els.durationSel.addEventListener("change", () => {
  state.duration = Number(els.durationSel.value);
  if (state.phase === "idle" || state.phase === "ended") els.timerNum.textContent = state.duration;
  save();
});
els.roundsSel.addEventListener("change", () => {
  state.totalRounds = Number(els.roundsSel.value);
  if (state.roundsPlayed > 0) els.roundPill.textContent = roundLabel();
  updateControls();
  save();
});
els.shuffleSets.addEventListener("change", () => {
  state.shuffle = els.shuffleSets.checked;
  save();
});

document.addEventListener("keydown", (e) => {
  const t = e.target;
  if (t.isContentEditable || t.tagName === "SELECT" || t.tagName === "INPUT") return;
  if (teamsOpen()) { if (e.code === "Escape") closeTeams(); return; }

  if (helpOpen()) {
    if (["Space", "Enter", "Escape", "KeyH"].includes(e.code)) { e.preventDefault(); closeHelp(); }
    return;
  }
  if (e.code === "KeyH") { openHelp(); return; }

  if (e.code === "Space" || e.code === "Enter") {
    e.preventDefault();
    if (els.gameOver.classList.contains("show")) return;
    nextRound();
  } else if (e.code === "KeyP") togglePause();
  else if (e.code === "KeyM") els.muteBtn.click();
  else if (e.code === "KeyF") toggleFullscreen();
  else if (e.code === "KeyR") revealWords();
  else if (e.code === "Escape") { openSettings(false); hideOverlay(els.timesUp); hideOverlay(els.reveal); }
  else if (/^Digit[1-6]$/.test(e.code)) {
    const i = Number(e.code.slice(-1)) - 1;
    if (i < state.teams.length) changeScore(i, e.shiftKey ? -1 : 1);
  }
});

/* ---------------------------------------------------------
   Boot
   --------------------------------------------------------- */
load();
state.phase = "idle";
buildReels();
renderTeams();
els.durationSel.value = String(state.duration);
els.roundsSel.value = String(state.totalRounds);
els.shuffleSets.checked = state.shuffle;
els.timerNum.textContent = state.duration;
if (state.roundsPlayed > 0) els.roundPill.textContent = roundLabel();
setHue(IDLE_HUE);
setProgress(1);
updateControls();

function helpRules() {
  return [
    ["👥", `<b>${state.teams.length} teams</b> go head-to-head over <b>${state.totalRounds} rounds</b>.`],
    ["🎰", `Each round, <b>10 letters</b> spin onto the screen.`],
    ["⏱️", `Your team gets <b>${state.duration} seconds</b> to huddle and build the <b>longest word</b> you can.`],
    ["🔤", `Use any of the letters, <b>each one only once</b>. You don't have to use them all.`],
    ["📖", `Real English words only. The host has the final say.`],
    ["🏆", `When time's up, teams reveal their words. The <b>longest valid word wins the round</b>.`],
    ["💡", `After each round, see the longest words that were possible.`],
  ];
}

/* ---------------------------------------------------------
   How-to-play screen (H to open; Space / Esc / click to close)
   --------------------------------------------------------- */
const helpEl = document.getElementById("help");
const helpOpen = () => helpEl.classList.contains("show");

function openHelp() {
  const list = document.getElementById("helpRules");
  list.innerHTML = helpRules()
    .map(([icon, html], i) => `<li style="animation-delay:${0.15 + i * 0.12}s"><span class="help-icon">${icon}</span><div>${html}</div></li>`)
    .join("");
  helpEl.classList.remove("show");
  void helpEl.offsetWidth;
  helpEl.classList.add("show");
  helpEl.setAttribute("aria-hidden", "false");
}
function closeHelp() {
  helpEl.classList.remove("show");
  helpEl.setAttribute("aria-hidden", "true");
}
document.getElementById("helpBtn").addEventListener("click", openHelp);
document.getElementById("helpClose").addEventListener("click", (e) => { e.stopPropagation(); closeHelp(); });
helpEl.addEventListener("click", (e) => { if (e.target === helpEl) closeHelp(); });

/* ---------------------------------------------------------
   Teams panel: number of teams (2–6) + names
   --------------------------------------------------------- */
const MIN_TEAMS = 2;
const MAX_TEAMS = TEAM_DEFAULTS.length;
const teamsPanelEl = document.getElementById("teamsPanel");
const teamsOpen = () => teamsPanelEl.classList.contains("show");

function openTeams() {
  renderTeamsPanel();
  teamsPanelEl.classList.add("show");
  teamsPanelEl.setAttribute("aria-hidden", "false");
}
function closeTeams() {
  teamsPanelEl.classList.remove("show");
  teamsPanelEl.setAttribute("aria-hidden", "true");
  renderTeams();
}

function renderTeamsPanel() {
  const n = state.teams.length;
  document.getElementById("teamCount").textContent = n;
  document.getElementById("teamCountMinus").disabled = n <= MIN_TEAMS;
  document.getElementById("teamCountPlus").disabled = n >= MAX_TEAMS;
  const list = document.getElementById("teamInputs");
  list.innerHTML = "";
  state.teams.forEach((team, i) => {
    const row = document.createElement("label");
    row.className = "team-input";
    row.style.setProperty("--team", TEAM_DEFAULTS[i].hue);
    row.innerHTML = `<span class="team-dot">${i + 1}</span><input type="text" maxlength="24" spellcheck="false" />`;
    const input = row.querySelector("input");
    input.value = team.name;
    input.placeholder = TEAM_DEFAULTS[i].name;
    input.addEventListener("input", () => {
      team.name = input.value.trim() || TEAM_DEFAULTS[i].name;
      const nameEl = els.teams.children[i]?.querySelector(".team-name");
      if (nameEl) nameEl.textContent = team.name;
      save();
    });
    input.addEventListener("keydown", (e) => { if (e.key === "Enter") input.blur(); });
    list.appendChild(row);
  });
}

function setTeamCount(n) {
  n = Math.max(MIN_TEAMS, Math.min(MAX_TEAMS, n));
  if (n < state.teams.length) {
    const removed = state.teams.slice(n).filter((t) => t.score !== 0);
    if (removed.length && !confirm(`Remove ${removed.map((t) => t.name).join(" & ")}? Their points will be lost.`)) return;
    state.teams.length = n;
  }
  while (state.teams.length < n) state.teams.push({ name: TEAM_DEFAULTS[state.teams.length].name, score: 0 });
  save();
  renderTeams();
  renderTeamsPanel();
}

document.getElementById("teamsBtn").addEventListener("click", openTeams);
document.getElementById("teamsDone").addEventListener("click", closeTeams);
document.getElementById("teamCountMinus").addEventListener("click", () => setTeamCount(state.teams.length - 1));
document.getElementById("teamCountPlus").addEventListener("click", () => setTeamCount(state.teams.length + 1));
teamsPanelEl.addEventListener("click", (e) => { if (e.target === teamsPanelEl) closeTeams(); });
