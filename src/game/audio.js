// Site sounds made with WebAudio (no audio files): gravel footsteps, a soft UI blip, a chime when
// the office opens, and a low rumble of distant machinery. Nothing plays until the visitor's first
// click or key press, as browsers require.
const PREFS_KEY = 'wp.sitewalk.prefs';

function loadPrefs() {
  try { return JSON.parse(localStorage.getItem(PREFS_KEY)) || {}; } catch { return {}; }
}
function savePrefs(p) {
  try { localStorage.setItem(PREFS_KEY, JSON.stringify(p)); } catch { /* storage unavailable */ }
}

export function createAudio() {
  const prefs = loadPrefs();
  let muted = prefs.muted === true;
  let ctx = null, master = null, ambient = null, noise = null;

  function ensure() {
    if (ctx || muted) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = 0.7; master.connect(ctx.destination);
    // One second of noise, reused for footsteps and the ambient rumble.
    noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const data = noise.getChannelData(0); let last = 0;
    for (let i = 0; i < data.length; i++) { const w = Math.random() * 2 - 1; last = (last + 0.02 * w) / 1.02; data[i] = last * 3.5; }
    return ctx;
  }
  const unlock = () => { if (ensure()?.state === 'suspended') ctx.resume(); };
  window.addEventListener('pointerdown', unlock);
  window.addEventListener('keydown', unlock);

  function step() {
    if (muted || !ensure()) return;
    const src = ctx.createBufferSource(); src.buffer = noise;
    const filter = ctx.createBiquadFilter(); filter.type = 'bandpass'; filter.frequency.value = 900 + Math.random() * 500; filter.Q.value = 0.8;
    const gain = ctx.createGain(); const t = ctx.currentTime;
    gain.gain.setValueAtTime(0.0001, t); gain.gain.exponentialRampToValueAtTime(0.22, t + 0.01); gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
    src.connect(filter).connect(gain).connect(master);
    src.start(t, Math.random() * 0.8, 0.14);
  }
  function tone(freq, start, dur, vol = 0.12) {
    const osc = ctx.createOscillator(); osc.type = 'sine'; osc.frequency.value = freq;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.0001, start); gain.gain.exponentialRampToValueAtTime(vol, start + 0.015); gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    osc.connect(gain).connect(master); osc.start(start); osc.stop(start + dur + 0.02);
  }
  // Rising then falling rush of air for the sky swoop.
  function whoosh() {
    if (muted || !ensure()) return;
    const src = ctx.createBufferSource(); src.buffer = noise; src.loop = true;
    const filter = ctx.createBiquadFilter(); filter.type = 'bandpass'; filter.Q.value = 0.7;
    const gain = ctx.createGain(); const t = ctx.currentTime;
    filter.frequency.setValueAtTime(300, t); filter.frequency.exponentialRampToValueAtTime(2200, t + 1.1); filter.frequency.exponentialRampToValueAtTime(400, t + 2.4);
    gain.gain.setValueAtTime(0.0001, t); gain.gain.exponentialRampToValueAtTime(0.28, t + 0.9); gain.gain.exponentialRampToValueAtTime(0.0001, t + 2.4);
    src.connect(filter).connect(gain).connect(master); src.start(t); src.stop(t + 2.5);
  }
  function blip() { if (!muted && ensure()) tone(740, ctx.currentTime, 0.12); }
  // Rising four-note fanfare for finishing a level.
  function fanfare() { if (!muted && ensure()) { const t = ctx.currentTime; [523, 659, 784, 1047].forEach((f, i) => tone(f, t + i * 0.11, i === 3 ? 0.6 : 0.22, i === 3 ? 0.11 : 0.1)); } }
  function chime() { if (!muted && ensure()) { const t = ctx.currentTime; tone(660, t, 0.25); tone(880, t + 0.12, 0.25); tone(1320, t + 0.24, 0.4, 0.09); } }

  function setAmbient(on) {
    if (!on || muted) { ambient?.src.stop(); ambient = null; return; }
    if (ambient || !ensure()) return;
    const src = ctx.createBufferSource(); src.buffer = noise; src.loop = true;
    const filter = ctx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.value = 260;
    const gain = ctx.createGain(); gain.gain.value = 0.05;
    src.connect(filter).connect(gain).connect(master); src.start();
    ambient = { src };
  }

  return {
    step, blip, chime, fanfare, whoosh, setAmbient,
    get muted() { return muted; },
    setMuted(v) {
      muted = v; savePrefs({ ...loadPrefs(), muted: v });
      if (v) setAmbient(false);
    },
  };
}
