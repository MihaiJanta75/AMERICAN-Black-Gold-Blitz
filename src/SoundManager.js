/* ===== PROCEDURAL SOUND (Web Audio API) ===== */
let audioCtx = null;

export function initAudio() {
  if (audioCtx) return;
  try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { /* unsupported */ }
}

export function playSound(type, vol, soundOn) {
  if (!audioCtx || !soundOn) return;
  vol = vol || 0.3;
  const now = audioCtx.currentTime;
  try {
    if (type === "shoot") {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "square"; osc.frequency.setValueAtTime(800, now); osc.frequency.exponentialRampToValueAtTime(200, now + 0.08);
      gain.gain.setValueAtTime(vol * 0.15, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      osc.connect(gain); gain.connect(audioCtx.destination);
      osc.start(now); osc.stop(now + 0.08);
    } else if (type === "explosion") {
      const bufferSize = audioCtx.sampleRate * 0.3;
      const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 2);
      const source = audioCtx.createBufferSource();
      const gain = audioCtx.createGain();
      source.buffer = buffer;
      gain.gain.setValueAtTime(vol * 0.4, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      const filter = audioCtx.createBiquadFilter();
      filter.type = "lowpass"; filter.frequency.setValueAtTime(600, now); filter.frequency.exponentialRampToValueAtTime(100, now + 0.3);
      source.connect(filter); filter.connect(gain); gain.connect(audioCtx.destination);
      source.start(now);
    } else if (type === "pickup") {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine"; osc.frequency.setValueAtTime(600, now); osc.frequency.exponentialRampToValueAtTime(1200, now + 0.1);
      gain.gain.setValueAtTime(vol * 0.12, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc.connect(gain); gain.connect(audioCtx.destination);
      osc.start(now); osc.stop(now + 0.12);
    } else if (type === "levelup") {
      [0, 0.08, 0.16].forEach((delay, idx) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = "sine"; osc.frequency.setValueAtTime(500 + idx * 200, now + delay);
        gain.gain.setValueAtTime(vol * 0.15, now + delay); gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.15);
        osc.connect(gain); gain.connect(audioCtx.destination);
        osc.start(now + delay); osc.stop(now + delay + 0.15);
      });
    } else if (type === "hit") {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sawtooth"; osc.frequency.setValueAtTime(150, now); osc.frequency.exponentialRampToValueAtTime(60, now + 0.12);
      gain.gain.setValueAtTime(vol * 0.2, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
      osc.connect(gain); gain.connect(audioCtx.destination);
      osc.start(now); osc.stop(now + 0.12);
    } else if (type === "missile") {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sawtooth"; osc.frequency.setValueAtTime(300, now); osc.frequency.exponentialRampToValueAtTime(100, now + 0.4);
      gain.gain.setValueAtTime(vol * 0.12, now); gain.gain.linearRampToValueAtTime(0, now + 0.4);
      osc.connect(gain); gain.connect(audioCtx.destination);
      osc.start(now); osc.stop(now + 0.4);
    } else if (type === "dash") {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = "sine"; osc.frequency.setValueAtTime(400, now); osc.frequency.exponentialRampToValueAtTime(800, now + 0.1);
      gain.gain.setValueAtTime(vol * 0.1, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      osc.connect(gain); gain.connect(audioCtx.destination);
      osc.start(now); osc.stop(now + 0.1);
    } else if (type === "powerup") {
      [0, 0.05, 0.1, 0.15].forEach((delay, idx) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = "sine"; osc.frequency.setValueAtTime(400 + idx * 150, now + delay);
        gain.gain.setValueAtTime(vol * 0.1, now + delay); gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.12);
        osc.connect(gain); gain.connect(audioCtx.destination);
        osc.start(now + delay); osc.stop(now + delay + 0.12);
      });
    }
  } catch (e) { /* audio error */ }
}
