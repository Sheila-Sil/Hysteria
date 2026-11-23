
/* ============================== procedural textures ============================== */
const TEX = {};
let maxAniso = 8;
function canvasTex(w, h, draw, { srgb = true, repeat = true } = {}) {
  const c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d'); draw(g, w, h);
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = maxAniso;
  return t;
}
function speckle(g, w, h, n, cols, size = [1, 2], alpha = [.05, .2]) {
  for (let i = 0; i < n; i++) { g.globalAlpha = rr(alpha[0], alpha[1]); g.fillStyle = pick(cols); const s = rr(size[0], size[1]); g.fillRect(rr(0, w), rr(0, h), s, s); }
  g.globalAlpha = 1;
}
function noiseFill(g, w, h, base, amp, scale = .03, oct = 4) {
  const img = g.createImageData(w, h), d = img.data; const [r, gg, b] = base;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    // tileable: sample on a torus
    const a = x / w * TAU, bb = y / h * TAU, R = w * scale / TAU;
    const n = fbm(Math.cos(a) * R + 10, Math.sin(a) * R + Math.cos(bb) * R * .7, oct) + fbm(Math.sin(bb) * R + 40, Math.cos(a) * R * .3, 2) * .5;
    const k = (y * w + x) * 4; d[k] = clamp(r + n * amp, 0, 255); d[k + 1] = clamp(gg + n * amp, 0, 255); d[k + 2] = clamp(b + n * amp * .9, 0, 255); d[k + 3] = 255;
  }
  g.putImageData(img, 0, 0);
}
function buildTextures(renderer) {
  maxAniso = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  // Brick: running bond, color jitter, soot toward the bottom.
  const brickDraw = (bump) => (g, w, h) => {
    g.fillStyle = bump ? '#222' : '#8f8a80'; g.fillRect(0, 0, w, h);
    const rows = 16, bh = h / rows, bw = w / 6;
    for (let r = 0; r < rows; r++) for (let c = -1; c < 7; c++) {
      const x = c * bw + (r % 2 ? bw / 2 : 0), y = r * bh;
      if (bump) { g.fillStyle = `rgb(${200 + rr(-30, 30)|0},${200 + rr(-30, 30)|0},${200 + rr(-30, 30)|0})`; }
      else { const t = rand(); const base = t < .15 ? [92, 40, 32] : t < .3 ? [140, 72, 52] : [118, 52, 40]; const j = rr(-14, 14); g.fillStyle = `rgb(${base[0] + j|0},${base[1] + j * .6|0},${base[2] + j * .5|0})`; }
      g.fillRect(x + 2, y + 2, bw - 4, bh - 4);
      if (!bump) { g.globalAlpha = .18; g.fillStyle = '#000'; g.fillRect(x + 2, y + bh - 5, bw - 4, 3); g.globalAlpha = 1; speckle(g, 0, 0, 0, ['#000']); }
    }
    if (!bump) speckle(g, w, h, 2500, ['#2a1a14', '#c8a38a', '#5a3a2a'], [1, 3], [.08, .3]);
  };
  TEX.brick = canvasTex(512, 512, brickDraw(false));
  TEX.brickBump = canvasTex(512, 512, brickDraw(true), { srgb: false });
  TEX.stone = canvasTex(256, 256, (g, w, h) => { noiseFill(g, w, h, [176, 168, 152], 38, .05); g.strokeStyle = 'rgba(60,55,48,.45)'; g.lineWidth = 2; for (let y = 0; y <= h; y += 64) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); } for (let y = 0; y < h; y += 64) for (let x = (y / 64 % 2) * 64; x < w; x += 128) { g.beginPath(); g.moveTo(x, y); g.lineTo(x, y + 64); g.stroke(); } });
  TEX.slate = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#2b3036'; g.fillRect(0, 0, w, h);
    for (let r = 0; r < 12; r++) for (let c = -1; c < 9; c++) { const x = c * 32 + (r % 2 ? 16 : 0), y = r * 21.3; const j = rr(-10, 10); g.fillStyle = `rgb(${52 + j|0},${58 + j|0},${66 + j|0})`; g.fillRect(x + 1, y + 1, 30, 20); g.fillStyle = 'rgba(0,0,0,.35)'; g.fillRect(x + 1, y + 17, 30, 4); }
  });
  TEX.shingle = canvasTex(256, 256, (g, w, h) => {
    g.fillStyle = '#3a2f2a'; g.fillRect(0, 0, w, h);
    for (let r = 0; r < 10; r++) for (let c = -1; c < 7; c++) { const x = c * 42 + (r % 2 ? 21 : 0), y = r * 25.6; const j = rr(-12, 12); g.fillStyle = `rgb(${70 + j|0},${58 + j|0},${52 + j|0})`; g.fillRect(x + 1, y, 40, 24); g.fillStyle = 'rgba(0,0,0,.4)'; g.fillRect(x + 1, y + 20, 40, 5); }
  });
  TEX.wood = canvasTex(512, 512, (g, w, h) => {
    const pw = w / 8;
    for (let i = 0; i < 8; i++) { const j = rr(-16, 16); g.fillStyle = `rgb(${176 + j|0},${126 + j * .8|0},${78 + j * .5|0})`; g.fillRect(i * pw, 0, pw, h);
      for (let k = 0; k < 26; k++) { g.strokeStyle = `rgba(90,52,24,${rr(.05, .22)})`; g.lineWidth = rr(.5, 2); g.beginPath(); const x = i * pw + rr(2, pw - 2); g.moveTo(x, 0); g.bezierCurveTo(x + rr(-6, 6), h * .3, x + rr(-6, 6), h * .7, x + rr(-3, 3), h); g.stroke(); }
      g.fillStyle = 'rgba(40,20,8,.55)'; g.fillRect(i * pw, 0, 2, h); const cut = rr(0, h); g.fillRect(i * pw, cut, pw, 2); }
  });
  TEX.woodDark = canvasTex(256, 256, (g, w, h) => { noiseFill(g, w, h, [74, 46, 30], 26, .02, 3); for (let k = 0; k < 60; k++) { g.strokeStyle = `rgba(20,10,4,${rr(.1, .3)})`; g.beginPath(); const y = rr(0, h); g.moveTo(0, y); g.bezierCurveTo(w * .3, y + rr(-5, 5), w * .6, y + rr(-5, 5), w, y); g.stroke(); } });
  TEX.siding = canvasTex(256, 256, (g, w, h) => { g.fillStyle = '#d9d4c8'; g.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 16) { g.fillStyle = 'rgba(0,0,0,.18)'; g.fillRect(0, y + 13, w, 3); g.fillStyle = 'rgba(255,255,255,.25)'; g.fillRect(0, y, w, 2); } speckle(g, w, h, 600, ['#8a8478'], [1, 2], [.05, .15]); }, {});
  TEX.asphalt = canvasTex(512, 512, (g, w, h) => { noiseFill(g, w, h, [58, 58, 60], 18, .08, 3); speckle(g, w, h, 9000, ['#8a8a8a', '#222', '#6d6a64'], [1, 2], [.15, .45]); });
  TEX.road = canvasTex(256, 512, (g, w, h) => {
    noiseFill(g, w, h, [52, 52, 54], 16, .1, 3); speckle(g, w, h, 5000, ['#888', '#1a1a1a'], [1, 2], [.15, .4]);
    g.fillStyle = '#d8b440'; g.globalAlpha = .85; g.fillRect(w / 2 - 7, 0, 4, h); g.fillRect(w / 2 + 3, 0, 4, h);
    g.fillStyle = '#e8e6df'; g.globalAlpha = .7; g.fillRect(10, 0, 5, h); g.fillRect(w - 15, 0, 5, h); g.globalAlpha = 1;
    for (let i = 0; i < 30; i++) { g.fillStyle = 'rgba(20,20,20,.3)'; g.fillRect(rr(0, w), rr(0, h), rr(10, 60), rr(1, 3)); }
  });
  TEX.concrete = canvasTex(256, 256, (g, w, h) => { noiseFill(g, w, h, [168, 164, 156], 22, .06, 3); speckle(g, w, h, 1500, ['#777', '#ddd'], [1, 2], [.1, .3]); g.fillStyle = 'rgba(70,66,60,.5)'; g.fillRect(0, 0, w, 2); });
  TEX.dirt = canvasTex(256, 256, (g, w, h) => { noiseFill(g, w, h, [108, 86, 62], 34, .05, 4); speckle(g, w, h, 2500, ['#4a3a2a', '#a08868', '#6b5238', '#c87a30'], [1, 3], [.15, .5]); });
  TEX.ground = canvasTex(512, 512, (g, w, h) => {
    noiseFill(g, w, h, [205, 205, 200], 40, .05, 4);
    speckle(g, w, h, 14000, ['#ffffff', '#9a9a8a', '#c9c9b0', '#7a7a6a'], [1, 3], [.08, .3]);
  });
  TEX.plaid = canvasTex(128, 128, (g, w, h) => {
    g.fillStyle = '#1d2a44'; g.fillRect(0, 0, w, h);
    g.globalAlpha = .55; g.fillStyle = '#28473a'; g.fillRect(0, 16, w, 30); g.fillRect(16, 0, 30, h);
    g.globalAlpha = .7; g.fillStyle = '#8e2228'; g.fillRect(0, 76, w, 4); g.fillRect(76, 0, 4, h);
    g.fillStyle = '#c9b88a'; g.globalAlpha = .4; g.fillRect(0, 100, w, 2); g.fillRect(100, 0, 2, h); g.globalAlpha = 1;
  });
  TEX.knit = canvasTex(64, 64, (g, w, h) => { g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); for (let y = 0; y < h; y += 4) for (let x = 0; x < w; x += 4) { g.fillStyle = `rgba(0,0,0,${(x + y) % 8 ? .06 : .14})`; g.fillRect(x, y, 2, 3); } });
  TEX.denim = canvasTex(64, 64, (g, w, h) => { g.fillStyle = '#fff'; g.fillRect(0, 0, w, h); for (let i = -h; i < w; i += 3) { g.strokeStyle = 'rgba(0,0,0,.13)'; g.beginPath(); g.moveTo(i, 0); g.lineTo(i + h, h); g.stroke(); } speckle(g, w, h, 300, ['#000', '#fff'], [1, 1], [.05, .2]); });
  TEX.court = canvasTex(1024, 512, (g, w, h) => {
    const pw = h / 26; for (let i = 0; i < 26; i++) { const j = rr(-12, 12); g.fillStyle = `rgb(${196 + j|0},${150 + j * .8|0},${96 + j * .5|0})`; g.fillRect(0, i * pw, w, pw); g.fillStyle = 'rgba(80,40,10,.25)'; g.fillRect(0, i * pw, w, 1.5); for (let k = 0; k < 8; k++) g.fillRect(rr(0, w), i * pw, 1.5, pw); }
    g.strokeStyle = 'rgba(250,250,245,.85)'; g.lineWidth = 5; g.strokeRect(40, 30, w - 80, h - 60);
    g.beginPath(); g.moveTo(w / 2, 30); g.lineTo(w / 2, h - 30); g.stroke(); g.beginPath(); g.arc(w / 2, h / 2, 70, 0, TAU); g.stroke();
    g.fillStyle = 'rgba(140,30,34,.85)'; g.fillRect(40, h / 2 - 70, 170, 140); g.fillRect(w - 210, h / 2 - 70, 170, 140);
    g.strokeRect(40, h / 2 - 70, 170, 140); g.strokeRect(w - 210, h / 2 - 70, 170, 140);
    g.beginPath(); g.arc(210, h / 2, 70, -Math.PI / 2, Math.PI / 2); g.stroke(); g.beginPath(); g.arc(w - 210, h / 2, 70, Math.PI / 2, Math.PI * 1.5); g.stroke();
    g.save(); g.translate(w / 2, h / 2); g.fillStyle = 'rgba(140,30,34,.9)'; g.font = 'bold 54px Georgia,serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('LIONS', 0, 0); g.restore();
  }, { repeat: false });
  TEX.field = canvasTex(1024, 512, (g, w, h) => {
    for (let i = 0; i < 12; i++) { g.fillStyle = i % 2 ? '#4e6b2e' : '#56753a'; g.fillRect(i * w / 12, 0, w / 12, h); }
    speckle(g, w, h, 8000, ['#3a5222', '#6c8a44'], [1, 3], [.2, .5]);
    g.strokeStyle = 'rgba(245,245,240,.85)'; g.lineWidth = 4; g.strokeRect(20, 20, w - 40, h - 40);
    for (let i = 1; i < 12; i++) { const x = 20 + i * (w - 40) / 12; g.beginPath(); g.moveTo(x, 20); g.lineTo(x, h - 20); g.stroke(); }
    g.fillStyle = 'rgba(140,30,34,.75)'; g.fillRect(22, 22, (w - 40) / 12 - 4, h - 44); g.fillRect(w - 20 - (w - 40) / 12 + 2, 22, (w - 40) / 12 - 4, h - 44);
    g.save(); g.fillStyle = 'rgba(245,240,230,.9)'; g.font = 'bold 40px Georgia,serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.translate(20 + (w - 40) / 24, h / 2); g.rotate(-Math.PI / 2); g.fillText('LIONS', 0, 0); g.restore();
    g.save(); g.fillStyle = 'rgba(245,240,230,.9)'; g.font = 'bold 40px Georgia,serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.translate(w - 20 - (w - 40) / 24, h / 2); g.rotate(Math.PI / 2); g.fillText('LIONS', 0, 0); g.restore();
  }, { repeat: false });
  TEX.checker = canvasTex(256, 256, (g, w, h) => { for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) { g.fillStyle = (x + y) % 2 ? '#e8e2d4' : '#1c1c1e'; g.fillRect(x * 32, y * 32, 32, 32); } speckle(g, w, h, 800, ['#888'], [1, 2], [.05, .2]); });
  // Window: four panes with mullions; alpha used for the arched variant.
  const winDraw = (lit, arch) => (g, w, h) => {
    g.clearRect(0, 0, w, h);
    g.save();
    if (arch) { g.beginPath(); g.moveTo(0, h); g.lineTo(0, w / 2); g.arc(w / 2, w / 2, w / 2, Math.PI, 0); g.lineTo(w, h); g.closePath(); g.clip(); }
    const grd = g.createLinearGradient(0, 0, 0, h);
    if (lit) { grd.addColorStop(0, '#ffd99a'); grd.addColorStop(1, '#ffb45e'); } else { grd.addColorStop(0, '#2c3540'); grd.addColorStop(1, '#141a20'); }
    g.fillStyle = grd; g.fillRect(0, 0, w, h);
    if (lit) { g.fillStyle = 'rgba(120,70,30,.35)'; g.fillRect(w * .1, h * .55, w * .35, h * .45); g.fillRect(w * .62, h * .4, w * .25, h * .6); }
    else { g.fillStyle = 'rgba(160,190,210,.12)'; g.beginPath(); g.moveTo(0, h * .6); g.lineTo(w * .6, 0); g.lineTo(w, 0); g.lineTo(0, h); g.fill(); }
    g.fillStyle = '#e9e2d0'; const m = w * .07;
    g.fillRect(0, 0, m, h); g.fillRect(w - m, 0, m, h); g.fillRect(0, h - m, w, m); g.fillRect(w / 2 - m / 2, 0, m, h); g.fillRect(0, h * .5, w, m * .8);
    if (!arch) g.fillRect(0, 0, w, m);
    g.restore();
    if (arch) { g.strokeStyle = '#e9e2d0'; g.lineWidth = w * .07; g.beginPath(); g.arc(w / 2, w / 2, w / 2 - w * .035, Math.PI, 0); g.stroke(); }
  };
  TEX.winLit = canvasTex(64, 128, winDraw(true, false));
  TEX.winDark = canvasTex(64, 128, winDraw(false, false));
  TEX.archLit = canvasTex(64, 128, winDraw(true, true));
  TEX.archDark = canvasTex(64, 128, winDraw(false, true));
  TEX.stained = canvasTex(128, 320, (g, w, h) => {
    g.save(); g.beginPath(); g.moveTo(0, h); g.lineTo(0, w / 2); g.arc(w / 2, w / 2, w / 2, Math.PI, 0); g.lineTo(w, h); g.closePath(); g.clip();
    const cols = ['#b0222c', '#1f4fa8', '#d9a128', '#2b7a4b', '#6b2d8a', '#c8572a', '#2a8aa0'];
    for (let y = 0; y < h; y += 26) for (let x = 0; x < w; x += 26) { g.fillStyle = pick(cols); g.beginPath(); g.moveTo(x + rr(-6, 6), y + rr(-6, 6)); g.lineTo(x + 26 + rr(-6, 6), y + rr(-6, 6)); g.lineTo(x + 26 + rr(-6, 6), y + 26 + rr(-6, 6)); g.lineTo(x + rr(-6, 6), y + 26 + rr(-6, 6)); g.fill(); }
    g.fillStyle = '#f3e3b0'; g.beginPath(); g.arc(w / 2, w * .6, w * .22, 0, TAU); g.fill();
    g.fillStyle = '#d8c070'; g.fillRect(w / 2 - 6, w * .9, 12, h * .55); g.fillRect(w / 2 - 30, w * .9 + 40, 60, 12);
    g.strokeStyle = '#111'; g.lineWidth = 3; for (let y = 0; y < h; y += 26) { g.beginPath(); g.moveTo(0, y + rr(-3, 3)); g.lineTo(w, y + rr(-3, 3)); g.stroke(); } for (let x = 0; x < w; x += 26) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x + rr(-4, 4), h); g.stroke(); }
    g.restore(); g.strokeStyle = '#111'; g.lineWidth = 8; g.beginPath(); g.moveTo(4, h); g.lineTo(4, w / 2); g.arc(w / 2, w / 2, w / 2 - 4, Math.PI, 0); g.lineTo(w - 4, h); g.stroke();
  }, { repeat: false });
  TEX.rose = canvasTex(256, 256, (g, w, h) => {
    const cx = w / 2, cy = h / 2, cols = ['#b0222c', '#1f4fa8', '#d9a128', '#2b7a4b', '#6b2d8a'];
    for (let ring = 4; ring >= 1; ring--) for (let i = 0; i < 16; i++) { g.fillStyle = cols[(i + ring) % cols.length]; g.beginPath(); g.moveTo(cx, cy); g.arc(cx, cy, ring * 30, i / 16 * TAU, (i + 1) / 16 * TAU); g.fill(); }
    g.strokeStyle = '#111'; g.lineWidth = 4; for (let ring = 1; ring <= 4; ring++) { g.beginPath(); g.arc(cx, cy, ring * 30, 0, TAU); g.stroke(); }
    for (let i = 0; i < 16; i++) { g.beginPath(); g.moveTo(cx, cy); g.lineTo(cx + Math.cos(i / 16 * TAU) * 120, cy + Math.sin(i / 16 * TAU) * 120); g.stroke(); }
    g.globalCompositeOperation = 'destination-in'; g.beginPath(); g.arc(cx, cy, 121, 0, TAU); g.fill();
  }, { repeat: false });
  TEX.clock = canvasTex(256, 256, (g, w, h) => {
    const cx = w / 2; g.fillStyle = '#efe6cc'; g.beginPath(); g.arc(cx, cx, 124, 0, TAU); g.fill();
    g.strokeStyle = '#2a2420'; g.lineWidth = 6; g.stroke();
    g.fillStyle = '#2a2420'; g.font = '26px Georgia,serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    const nums = ['XII', 'I', 'II', 'III', 'IIII', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI'];
    nums.forEach((n, i) => { const a = i / 12 * TAU - Math.PI / 2; g.save(); g.translate(cx + Math.cos(a) * 96, cx + Math.sin(a) * 96); g.rotate(a + Math.PI / 2); g.fillText(n, 0, 0); g.restore(); });
    for (let i = 0; i < 60; i++) { const a = i / 60 * TAU; g.fillRect(cx + Math.cos(a) * 114 - 1, cx + Math.sin(a) * 114 - 1, 2.5, 2.5); }
  }, { repeat: false });
  TEX.water = makeWaterNormal();
  TEX.face = {};
}
function makeWaterNormal() {
  const S = 256, data = new Uint8Array(S * S * 4), hgt = new Float32Array(S * S);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) { const a = x / S * TAU, b = y / S * TAU; hgt[y * S + x] = fbm(Math.cos(a) * 3 + 5, Math.sin(a) * 3 + Math.cos(b) * 3, 4) + fbm(Math.sin(b) * 3 + 9, Math.cos(b) * 2, 3) * .6; }
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const l = hgt[y * S + (x + S - 1) % S], r = hgt[y * S + (x + 1) % S], u = hgt[((y + S - 1) % S) * S + x], d = hgt[((y + 1) % S) * S + x];
    const v = new THREE.Vector3((l - r) * 4, (u - d) * 4, 1).normalize(); const k = (y * S + x) * 4;
    data[k] = (v.x * .5 + .5) * 255; data[k + 1] = (v.y * .5 + .5) * 255; data[k + 2] = (v.z * .5 + .5) * 255; data[k + 3] = 255;
  }
  const t = new THREE.DataTexture(data, S, S); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true; t.needsUpdate = true; return t;
}
function textTex(text, { w = 512, h = 128, font = 'Georgia,serif', size = 80, color = '#eee', bg = null, weight = '700', glow = null, stroke = null, letter = 0 } = {}) {
  return canvasTex(w, h, (g) => {
    if (bg) { g.fillStyle = bg; g.fillRect(0, 0, w, h); }
    g.font = `${weight} ${size}px ${font}`; g.textAlign = 'center'; g.textBaseline = 'middle';
    if ('letterSpacing' in g) g.letterSpacing = letter + 'px';
    if (glow) { g.shadowColor = glow; g.shadowBlur = size * .35; }
    if (stroke) { g.strokeStyle = stroke; g.lineWidth = size * .08; g.strokeText(text, w / 2, h / 2 + size * .04); }
    g.fillStyle = color; g.fillText(text, w / 2, h / 2 + size * .04);
  }, { repeat: false });
}
// Face texture painted onto the front of the head sphere (u = .25 faces +Z).
function faceTex(skin, brow, lip, eyeCol, fem) {
  const key = [skin, brow, lip, eyeCol, fem].join();
  if (TEX.face[key]) return TEX.face[key];
  const t = canvasTex(512, 256, (g, w, h) => {
    g.fillStyle = skin; g.fillRect(0, 0, w, h);
    const cx = w * .25, cy = h * .53;
    // soft shading
    const sh = g.createRadialGradient(cx, cy, 10, cx, cy, 120); sh.addColorStop(0, 'rgba(255,255,255,.08)'); sh.addColorStop(1, 'rgba(0,0,0,.08)'); g.fillStyle = sh; g.fillRect(0, 0, w, h);
    for (const s of [-1, 1]) {
      const ex = cx + s * 22, ey = cy - 2;
      g.fillStyle = 'rgba(0,0,0,.10)'; g.beginPath(); g.ellipse(ex, ey - 3, 13, 8, 0, 0, TAU); g.fill();
      g.fillStyle = '#f4efe8'; g.beginPath(); g.ellipse(ex, ey, 10, 6.2, 0, 0, TAU); g.fill();
      g.fillStyle = eyeCol; g.beginPath(); g.arc(ex + s * .5, ey, 5.2, 0, TAU); g.fill();
      g.fillStyle = '#0b0b0c'; g.beginPath(); g.arc(ex + s * .5, ey, 2.4, 0, TAU); g.fill();
      g.fillStyle = 'rgba(255,255,255,.9)'; g.beginPath(); g.arc(ex - 1.5, ey - 2, 1.4, 0, TAU); g.fill();
      g.strokeStyle = '#1a1210'; g.lineWidth = fem ? 2.6 : 1.8; g.beginPath(); g.ellipse(ex, ey, 10.5, 6.6, 0, Math.PI * 1.05, Math.PI * 1.95); g.stroke();
      if (fem) { g.lineWidth = 1.4; g.beginPath(); g.moveTo(ex + s * 9, ey - 3); g.lineTo(ex + s * 13, ey - 6); g.stroke(); }
      g.strokeStyle = brow; g.lineWidth = fem ? 3 : 4.5; g.lineCap = 'round'; g.beginPath(); g.moveTo(ex - s * 10, ey - 13); g.quadraticCurveTo(ex, ey - 17 - (fem ? 1 : 0), ex + s * 11, ey - 13 + (fem ? 0 : 1)); g.stroke();
      if (fem) { g.fillStyle = 'rgba(220,90,90,.10)'; g.beginPath(); g.ellipse(ex + s * 4, ey + 16, 12, 6, 0, 0, TAU); g.fill(); }
    }
    g.strokeStyle = 'rgba(0,0,0,.16)'; g.lineWidth = 2; g.beginPath(); g.moveTo(cx + 2, cy + 2); g.quadraticCurveTo(cx + 5, cy + 16, cx, cy + 20); g.stroke();
    g.fillStyle = 'rgba(0,0,0,.1)'; g.beginPath(); g.ellipse(cx, cy + 21, 5, 2, 0, 0, TAU); g.fill();
    g.fillStyle = lip; g.beginPath(); g.moveTo(cx - 11, cy + 33); g.quadraticCurveTo(cx, cy + 29, cx + 11, cy + 33); g.quadraticCurveTo(cx, cy + (fem ? 40 : 37), cx - 11, cy + 33); g.fill();
    g.strokeStyle = 'rgba(60,20,20,.5)'; g.lineWidth = 1.2; g.beginPath(); g.moveTo(cx - 11, cy + 33); g.quadraticCurveTo(cx, cy + 35, cx + 11, cy + 33); g.stroke();
  }, { repeat: false });
  TEX.face[key] = t; return t;
}
