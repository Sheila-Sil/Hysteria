import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { Sky } from 'three/addons/objects/Sky.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';
import * as SkeletonUtils from 'three/addons/utils/SkeletonUtils.js';

/* ============================== utilities ============================== */
const $ = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (a, b, t) => { t = clamp((t - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const damp = (a, b, l, dt) => lerp(a, b, 1 - Math.exp(-l * dt));
const TAU = Math.PI * 2;
const wrapAngle = a => { while (a > Math.PI) a -= TAU; while (a < -Math.PI) a += TAU; return a; };
const dampAngle = (a, b, l, dt) => a + wrapAngle(b - a) * (1 - Math.exp(-l * dt));
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
let rand = mulberry32(20041014);
const rr = (a, b) => a + (b - a) * rand();
const pick = arr => arr[Math.floor(rand() * arr.length)];
const store = {
  get(k, d) { try { const v = localStorage.getItem('hysteria:' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('hysteria:' + k, JSON.stringify(v)); } catch (e) { /* storage unavailable */ } },
  del(k) { try { localStorage.removeItem('hysteria:' + k); } catch (e) { /* ignore */ } }
};

/* Perlin noise */
const PERM = new Uint8Array(512);
{ const p = [...Array(256).keys()]; const r = mulberry32(77); for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; } for (let i = 0; i < 512; i++) PERM[i] = p[i & 255]; }
function grad2(h, x, y) { switch (h & 7) { case 0: return x + y; case 1: return -x + y; case 2: return x - y; case 3: return -x - y; case 4: return x; case 5: return -x; case 6: return y; default: return -y; } }
function noise2(x, y) {
  const fx = Math.floor(x), fy = Math.floor(y), X = fx & 255, Y = fy & 255; x -= fx; y -= fy;
  const u = x * x * x * (x * (x * 6 - 15) + 10), v = y * y * y * (y * (y * 6 - 15) + 10);
  const a = PERM[X] + Y, b = PERM[X + 1] + Y;
  return lerp(lerp(grad2(PERM[a], x, y), grad2(PERM[b], x - 1, y), u), lerp(grad2(PERM[a + 1], x, y - 1), grad2(PERM[b + 1], x - 1, y - 1), u), v);
}
function fbm(x, y, o = 4) { let s = 0, a = .5, f = 1; for (let i = 0; i < o; i++) { s += a * noise2(x * f, y * f); f *= 2.03; a *= .5; } return s; }
function segDist(px, pz, ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az, l2 = dx * dx + dz * dz;
  let t = l2 ? ((px - ax) * dx + (pz - az) * dz) / l2 : 0; t = clamp(t, 0, 1);
  return Math.hypot(px - (ax + dx * t), pz - (az + dz * t));
}
function polyDist(px, pz, pts) { let d = 1e9; for (let i = 0; i < pts.length - 1; i++) d = Math.min(d, segDist(px, pz, pts[i][0], pts[i][1], pts[i + 1][0], pts[i + 1][1])); return d; }

/* ============================== audio ============================== */
const AudioFX = {
  ctx: null, master: null, bus: {}, noiseBuf: null, ready: false, vol: store.get('vol', 0.8),
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    const ctx = this.ctx = new AC();
    this.master = ctx.createGain(); this.master.gain.value = this.vol;
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 3;
    this.master.connect(comp).connect(ctx.destination);
    // generated reverb impulse
    const len = ctx.sampleRate * 3.2, ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2); }
    this.verb = ctx.createConvolver(); this.verb.buffer = ir;
    const vg = ctx.createGain(); vg.gain.value = .55; this.verb.connect(vg).connect(this.master);
    for (const k of ['music', 'sfx', 'amb', 'ui']) { const g = ctx.createGain(); g.connect(this.master); this.bus[k] = g; }
    this.bus.music.gain.value = .55; this.bus.amb.gain.value = .5;
    const nb = this.noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate); const nd = nb.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    this.ready = true;
    this.startAmbience();
  },
  setVol(v) { this.vol = v; store.set('vol', v); if (this.master) this.master.gain.setTargetAtTime(v, this.ctx.currentTime, .05); },
  send(node, amt) { const g = this.ctx.createGain(); g.gain.value = amt; node.connect(g).connect(this.verb); return g; },
  noise(dur, { type = 'bandpass', freq = 1000, q = 1, gain = .3, attack = .005, bus = 'sfx', verb = 0, freqEnd = null, when = 0 } = {}) {
    if (!this.ready) return; const c = this.ctx, t = c.currentTime + when;
    const s = c.createBufferSource(); s.buffer = this.noiseBuf; s.loop = true;
    const f = c.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
    if (freqEnd) f.frequency.exponentialRampToValueAtTime(freqEnd, t + dur);
    const g = c.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain, t + attack); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    s.connect(f).connect(g).connect(this.bus[bus]); if (verb) this.send(g, verb);
    s.start(t, Math.random() * 1.5); s.stop(t + dur + .05);
  },
  tone(freq, dur, { type = 'sine', gain = .2, attack = .01, bus = 'sfx', verb = 0, freqEnd = null, when = 0, detune = 0 } = {}) {
    if (!this.ready) return; const c = this.ctx, t = c.currentTime + when;
    const o = c.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t); o.detune.value = detune;
    if (freqEnd) o.frequency.exponentialRampToValueAtTime(freqEnd, t + dur);
    const g = c.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain, t + attack); g.gain.exponentialRampToValueAtTime(.0001, t + dur);
    o.connect(g).connect(this.bus[bus]); if (verb) this.send(g, verb);
    o.start(t); o.stop(t + dur + .05);
  },
  ui() { this.tone(1760, .07, { gain: .05, bus: 'ui', type: 'triangle' }); },
  uiConfirm() { this.tone(880, .25, { gain: .06, bus: 'ui', type: 'triangle', verb: .3 }); this.tone(1320, .4, { gain: .04, bus: 'ui', when: .06, verb: .4 }); },
  step(surface, loud = 1) {
    const m = { grass: [700, .5, .06], concrete: [2400, 1.6, .05], wood: [480, 2.5, .09], dirt: [900, .7, .06], asphalt: [1900, 1.2, .05], leaves: [3200, .4, .07] }[surface] || [1500, 1, .05];
    this.noise(.09 + Math.random() * .03, { freq: m[0] * (0.85 + Math.random() * .3), q: m[1], gain: m[2] * loud, attack: .004 });
  },
  thud() { this.tone(70, .35, { gain: .5, freqEnd: 30 }); this.noise(.25, { freq: 400, q: .7, gain: .25 }); },
  heartbeat(gain = .5) { this.tone(58, .22, { gain, freqEnd: 38, attack: .006 }); this.tone(52, .26, { gain: gain * .8, freqEnd: 34, attack: .006, when: .26 }); },
  sting() {
    if (!this.ready) return;
    this.noise(2.4, { type: 'bandpass', freq: 300, freqEnd: 4200, q: 3, gain: .32, attack: 2.2, verb: .8 });
    for (const f of [233, 247, 311]) this.tone(f, 2.6, { type: 'sawtooth', gain: .05, attack: 2.3, verb: .7, detune: Math.random() * 30 });
    this.tone(40, 1.8, { gain: .7, when: 2.3, freqEnd: 24, attack: .005, verb: .4 });
    this.noise(1.2, { type: 'lowpass', freq: 900, gain: .4, when: 2.3, attack: .003, verb: .9 });
  },
  whisper(dur = 2.5, gain = .12) {
    if (!this.ready) return; const c = this.ctx, t = c.currentTime;
    const s = c.createBufferSource(); s.buffer = this.noiseBuf; s.loop = true;
    const f1 = c.createBiquadFilter(); f1.type = 'bandpass'; f1.Q.value = 9;
    const f2 = c.createBiquadFilter(); f2.type = 'bandpass'; f2.Q.value = 7;
    for (let i = 0; i < dur * 7; i++) { f1.frequency.setValueAtTime(600 + Math.random() * 1600, t + i / 7); f2.frequency.setValueAtTime(1800 + Math.random() * 2400, t + i / 7); }
    const g = c.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(gain, t + .4); g.gain.setValueAtTime(gain, t + dur - .5); g.gain.linearRampToValueAtTime(0, t + dur);
    const pan = c.createStereoPanner ? c.createStereoPanner() : null;
    const out = pan || g; if (pan) { pan.pan.setValueAtTime(Math.random() * 2 - 1, t); pan.pan.linearRampToValueAtTime(Math.random() * 2 - 1, t + dur); }
    s.connect(f1); s.connect(f2); f1.connect(g); f2.connect(g); if (pan) g.connect(pan);
    out.connect(this.bus.sfx); this.send(out, .9);
    s.start(t); s.stop(t + dur + .1);
  },
  bell(n = 1) {
    for (let i = 0; i < n; i++) {
      const w = i * 2.4;
      for (const [r, g, d] of [[1, .22, 5], [2.0, .1, 3.8], [2.76, .07, 3], [5.4, .04, 2], [.5, .12, 6]]) this.tone(196 * r, d, { gain: g * .55, when: w, attack: .004, verb: .9, bus: 'amb' });
    }
  },
  camera() { this.noise(.05, { freq: 5000, q: 2, gain: .2 }); this.noise(.12, { freq: 1500, q: 1, gain: .15, when: .06 }); this.tone(2400, .2, { gain: .04, when: .02, type: 'square' }); },
  pickup() { for (const [i, f] of [523, 659, 784, 1046].entries()) this.tone(f, .6, { gain: .07, when: i * .06, verb: .6, type: 'triangle' }); },
  success() { for (const [i, f] of [392, 494, 587, 740].entries()) this.tone(f, 2.4, { gain: .06, when: i * .12, verb: .8, type: 'triangle' }); this.tone(98, 3, { gain: .15, verb: .6 }); },
  alarm() { this.tone(660, .18, { type: 'square', gain: .05 }); this.tone(880, .18, { type: 'square', gain: .05, when: .2 }); },

  // ---- continuous layers ----
  startAmbience() {
    const c = this.ctx;
    const mk = (type, freq, q) => { const s = c.createBufferSource(); s.buffer = this.noiseBuf; s.loop = true; const f = c.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q; const g = c.createGain(); g.gain.value = 0; s.connect(f).connect(g).connect(this.bus.amb); s.start(); return { f, g }; };
    this.wind = mk('bandpass', 420, .6);
    this.windHi = mk('highpass', 5200, .4);
    // crickets: amplitude-modulated high sine
    const o = c.createOscillator(); o.frequency.value = 4400; const am = c.createGain(); am.gain.value = 0;
    const lfo = c.createOscillator(); lfo.type = 'square'; lfo.frequency.value = 22; const lg = c.createGain(); lg.gain.value = .5;
    lfo.connect(lg).connect(am.gain); const cg = c.createGain(); cg.gain.value = 0;
    o.connect(am).connect(cg).connect(this.bus.amb); o.start(); lfo.start();
    this.crickets = cg; this.cricketAM = am;
    // drone (used by intro, menus, visions)
    const dg = c.createGain(); dg.gain.value = 0; const df = c.createBiquadFilter(); df.type = 'lowpass'; df.frequency.value = 380; df.Q.value = 4;
    for (const [f, d] of [[55, 0], [55, 9], [82.4, -6], [110, 4], [164.8, -3]]) { const os = c.createOscillator(); os.type = 'sawtooth'; os.frequency.value = f; os.detune.value = d; os.connect(df); os.start(); }
    const dl = c.createOscillator(); dl.frequency.value = .07; const dlg = c.createGain(); dlg.gain.value = 260; dl.connect(dlg).connect(df.frequency); dl.start();
    df.connect(dg).connect(this.bus.music); this.send(dg, .6); this.droneG = dg;
    const sh = c.createGain(); sh.gain.value = 0;
    for (const f of [659.3, 987.8, 1318.5]) { const os = c.createOscillator(); os.frequency.value = f; const tg = c.createGain(); tg.gain.value = .03; const tl = c.createOscillator(); tl.frequency.value = .1 + Math.random() * .2; const tlg = c.createGain(); tlg.gain.value = .03; tl.connect(tlg).connect(tg.gain); tl.start(); os.connect(tg).connect(sh); os.start(); }
    sh.connect(this.bus.music); this.send(sh, 1); this.shimmerG = sh;
    // engine
    const eo = c.createOscillator(); eo.type = 'sawtooth'; eo.frequency.value = 40; const eo2 = c.createOscillator(); eo2.type = 'square'; eo2.frequency.value = 20;
    const ef = c.createBiquadFilter(); ef.type = 'lowpass'; ef.frequency.value = 300; const eg = c.createGain(); eg.gain.value = 0;
    const e2g = c.createGain(); e2g.gain.value = .4; eo.connect(ef); eo2.connect(e2g).connect(ef); ef.connect(eg).connect(this.bus.sfx); eo.start(); eo2.start();
    this.engine = { o: eo, o2: eo2, f: ef, g: eg };
  },
  setLayer(node, v, t = .8) { if (node && this.ctx) node.gain.setTargetAtTime(v, this.ctx.currentTime, t); },
  setAmbience({ wind = .3, crickets = 0, drone = 0, shimmer = 0 }) {
    if (!this.ready) return;
    this.setLayer(this.wind.g, wind * .55); this.setLayer(this.windHi.g, wind * .05);
    this.setLayer(this.crickets, crickets * .018); this.setLayer(this.droneG, drone * .1, 1.6); this.setLayer(this.shimmerG, shimmer, 1.6);
    const t = this.ctx.currentTime; this.wind.f.frequency.setTargetAtTime(300 + Math.sin(t * .13) * 160 + Math.random() * 60, t, 1.5);
  },
  setEngine(on, rpm = 0) {
    if (!this.ready) return; const t = this.ctx.currentTime;
    this.engine.g.gain.setTargetAtTime(on ? .09 + rpm * .05 : 0, t, .12);
    this.engine.o.frequency.setTargetAtTime(38 + rpm * 120, t, .08); this.engine.o2.frequency.setTargetAtTime(19 + rpm * 60, t, .08);
    this.engine.f.frequency.setTargetAtTime(220 + rpm * 900, t, .1);
  },

  // ---- music for the routine (synthesised, 2004 pop-ish) ----
  music: null,
  startSong(bpm, bars) {
    if (!this.ready) return null; const c = this.ctx; const spb = 60 / bpm; const start = c.currentTime + .25;
    const mg = c.createGain(); mg.gain.value = .9; mg.connect(this.bus.music);
    const kick = t => { const o = c.createOscillator(); const g = c.createGain(); o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(42, t + .14); g.gain.setValueAtTime(.9, t); g.gain.exponentialRampToValueAtTime(.001, t + .32); o.connect(g).connect(mg); o.start(t); o.stop(t + .35); };
    const snare = t => { const s = c.createBufferSource(); s.buffer = this.noiseBuf; const f = c.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 1500; const g = c.createGain(); g.gain.setValueAtTime(.35, t); g.gain.exponentialRampToValueAtTime(.001, t + .18); s.connect(f).connect(g).connect(mg); this.send(g, .25); s.start(t, Math.random()); s.stop(t + .2); const o = c.createOscillator(); const og = c.createGain(); o.frequency.value = 190; og.gain.setValueAtTime(.25, t); og.gain.exponentialRampToValueAtTime(.001, t + .09); o.connect(og).connect(mg); o.start(t); o.stop(t + .1); };
    const hat = (t, v = .08) => { const s = c.createBufferSource(); s.buffer = this.noiseBuf; const f = c.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 8000; const g = c.createGain(); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.001, t + .05); s.connect(f).connect(g).connect(mg); s.start(t, Math.random()); s.stop(t + .06); };
    const synth = (t, f, d, v = .06, type = 'sawtooth') => { const o = c.createOscillator(); o.type = type; o.frequency.value = f; const o2 = c.createOscillator(); o2.type = type; o2.frequency.value = f; o2.detune.value = 12; const fl = c.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.setValueAtTime(2600, t); fl.frequency.exponentialRampToValueAtTime(500, t + d); const g = c.createGain(); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(v, t + .01); g.gain.exponentialRampToValueAtTime(.001, t + d); o.connect(fl); o2.connect(fl); fl.connect(g).connect(mg); this.send(g, .3); o.start(t); o2.start(t); o.stop(t + d + .02); o2.stop(t + d + .02); };
    // Am - F - C - G with a minor-key pluck melody
    const prog = [[220, 261.6, 329.6], [174.6, 220, 261.6], [130.8, 164.8, 196], [196, 246.9, 293.7]];
    const bass = [55, 43.65, 65.4, 49];
    const mel = [659.3, 587.3, 523.3, 587.3, 659.3, 784, 659.3, 523.3, 440, 523.3, 587.3, 523.3, 493.9, 440, 392, 440];
    for (let b = 0; b < bars; b++) {
      const ch = prog[b % 4], bt = start + b * 4 * spb;
      for (let i = 0; i < 4; i++) { const t = bt + i * spb; kick(t); if (i % 2) snare(t); hat(t + spb / 2, .1); hat(t, .05); if (b >= 2) synth(t + spb / 2, bass[b % 4] * 2, spb * .45, .07, 'square'); }
      for (const f of ch) synth(bt, f, spb * 3.6, .028);
      if (b >= 4) for (let i = 0; i < 4; i++) synth(bt + i * spb + (i % 2 ? spb * .5 : 0), mel[(b % 4) * 4 + i], spb * .8, .04, 'triangle');
    }
    this.music = { mg, start, spb };
    return this.music;
  },
  stopSong() { if (this.music) { const t = this.ctx.currentTime; this.music.mg.gain.setTargetAtTime(0, t, .2); const m = this.music.mg; setTimeout(() => m.disconnect(), 1500); this.music = null; } }
};
