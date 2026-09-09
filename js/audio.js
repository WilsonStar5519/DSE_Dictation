/**
 * 街機音效：用 WebAudio 即時合成，不用任何音檔，避免拖慢載入。
 * 瀏覽器要求先有使用者互動才能出聲，所以第一次點擊時才建立 context。
 */
(function (global) {
  let ctx = null;
  let master = null;
  let enabled = true;

  function ensure() {
    if (ctx) return ctx;
    const Ctor = global.AudioContext || global.webkitAudioContext;
    if (!Ctor) return null;
    try {
      ctx = new Ctor();
      master = ctx.createGain();
      master.gain.value = 0.16;
      master.connect(ctx.destination);
    } catch (err) {
      ctx = null;
    }
    return ctx;
  }

  function blip(freq, dur, type, gain, slideTo) {
    if (!enabled) return;
    const ac = ensure();
    if (!ac) return;
    if (ac.state === "suspended") ac.resume();
    const osc = ac.createOscillator();
    const env = ac.createGain();
    const now = ac.currentTime;
    osc.type = type || "square";
    osc.frequency.setValueAtTime(freq, now);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, now + dur);
    env.gain.setValueAtTime(0.0001, now);
    env.gain.exponentialRampToValueAtTime(gain === undefined ? 0.9 : gain, now + 0.012);
    env.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    osc.connect(env);
    env.connect(master);
    osc.start(now);
    osc.stop(now + dur + 0.02);
  }

  function noise(dur, gain) {
    if (!enabled) return;
    const ac = ensure();
    if (!ac) return;
    const frames = Math.floor(ac.sampleRate * dur);
    const buffer = ac.createBuffer(1, frames, ac.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < frames; i++) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / frames);
    }
    const src = ac.createBufferSource();
    const env = ac.createGain();
    env.gain.value = gain === undefined ? 0.5 : gain;
    src.buffer = buffer;
    src.connect(env);
    env.connect(master);
    src.start();
  }

  const notes = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5];

  global.FanwenAudio = {
    setEnabled: function (value) {
      enabled = !!value;
    },
    isEnabled: function () {
      return enabled;
    },
    unlock: function () {
      const ac = ensure();
      if (ac && ac.state === "suspended") ac.resume();
    },
    ui: function () {
      blip(420, 0.06, "square", 0.5);
    },
    correct: function (combo) {
      const idx = Math.min(notes.length - 1, Math.max(0, combo || 0));
      blip(notes[idx], 0.1, "square", 0.7);
      blip(notes[idx] * 2, 0.06, "triangle", 0.3);
    },
    wrong: function () {
      blip(180, 0.18, "sawtooth", 0.6, 90);
    },
    eat: function () {
      blip(660, 0.05, "triangle", 0.35);
    },
    boost: function () {
      blip(240, 0.08, "sawtooth", 0.22, 360);
    },
    segment: function () {
      blip(659.25, 0.1, "square", 0.6);
      setTimeout(function () {
        blip(880, 0.12, "square", 0.6);
      }, 90);
    },
    win: function () {
      [523.25, 659.25, 783.99, 1046.5].forEach(function (f, i) {
        setTimeout(function () {
          blip(f, 0.16, "square", 0.65);
        }, i * 110);
      });
    },
    lose: function () {
      noise(0.22, 0.35);
      [392, 311, 233].forEach(function (f, i) {
        setTimeout(function () {
          blip(f, 0.2, "sawtooth", 0.55);
        }, i * 130);
      });
    },
    kill: function () {
      noise(0.18, 0.3);
      blip(140, 0.24, "sawtooth", 0.5, 70);
    },
  };
})(window);
