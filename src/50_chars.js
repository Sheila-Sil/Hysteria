
/* ============================== characters ============================== */
const SKINS = ['#f3d6c1', '#e8c0a2', '#d9a582', '#c08a64', '#a06c4a', '#7d5136', '#5e3b26', '#43281a'];
const HAIRS = ['#16110e', '#3a2618', '#5a3a22', '#8a5a32', '#b88a52', '#dcc08a', '#7a2a1a', '#3c3c44'];
const ACCENTS = ['#7e1d20', '#1d2a44', '#2f4a36', '#5a4a6e', '#8a6a2a', '#3a3a3e'];
const GEO = {};
function charGeos() {
  if (GEO.ready) return GEO;
  const lathe = pts => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), 20);
  GEO.torsoF = lathe([[0, -.02], [.125, 0], [.118, .1], [.128, .2], [.15, .3], [.158, .36], [.15, .42], [.11, .47], [.05, .5], [0, .5]]);
  GEO.torsoM = lathe([[0, -.02], [.14, 0], [.14, .12], [.155, .24], [.175, .34], [.185, .41], [.17, .46], [.11, .5], [.05, .52], [0, .52]]);
  GEO.pelvisF = lathe([[0, -.12], [.1, -.12], [.15, -.06], [.155, 0], [.13, .04], [0, .04]]);
  GEO.pelvisM = lathe([[0, -.12], [.11, -.12], [.15, -.06], [.15, 0], [.14, .04], [0, .04]]);
  GEO.limbU = new THREE.CapsuleGeometry(.056, .2, 4, 12); GEO.limbU.translate(0, -.14, 0);
  GEO.limbL = new THREE.CapsuleGeometry(.046, .2, 4, 12); GEO.limbL.translate(0, -.13, 0);
  GEO.shoulder = new THREE.SphereGeometry(.068, 14, 10); GEO.shoulder.scale(1.1, .9, 1);
  GEO.thigh = new THREE.CapsuleGeometry(.074, .3, 4, 12); GEO.thigh.translate(0, -.2, 0);
  GEO.shin = new THREE.CapsuleGeometry(.052, .32, 4, 10); GEO.shin.translate(0, -.2, 0);
  GEO.hand = new THREE.SphereGeometry(.042, 10, 8); GEO.hand.scale(1, 1.25, .7);
  GEO.foot = new THREE.CapsuleGeometry(.045, .14, 4, 8); GEO.foot.rotateX(Math.PI / 2); GEO.foot.scale(1.15, .9, 1);
  GEO.head = new THREE.SphereGeometry(.112, 32, 24); GEO.head.scale(.94, 1.1, 1);
  { const p = GEO.head.attributes.position; for (let i = 0; i < p.count; i++) { const y = p.getY(i), z = p.getZ(i); if (y < -.03) { const k = clamp((-.03 - y) / .09, 0, 1); p.setX(i, p.getX(i) * (1 - k * .28)); if (z > 0) p.setZ(i, z * (1 - k * .12)); } } GEO.head.computeVertexNormals(); }
  GEO.neck = new THREE.CylinderGeometry(.05, .056, .12, 12);
  GEO.ear = new THREE.SphereGeometry(.022, 8, 6); GEO.ear.scale(.6, 1, .8);
  GEO.capTop = jag(new THREE.SphereGeometry(.122, 36, 14, 0, TAU, 0, 1.15), .018, 1); GEO.capTop.scale(.97, 1.12, 1.04);
  GEO.capBack = jag(new THREE.SphereGeometry(.124, 36, 14, Math.PI / 2 + .95, TAU - 1.9, .8, 1.25), .03, 2); GEO.capBack.scale(.97, 1.12, 1.04);
  GEO.fringe = jag(new THREE.SphereGeometry(.126, 28, 8, Math.PI / 2 - .9, 1.8, .55, .52), .028, 3); GEO.fringe.scale(.97, 1.12, 1.06);
  GEO.lock = new THREE.CapsuleGeometry(.03, .26, 3, 8); GEO.lock.translate(0, -.15, 0); GEO.lock.scale(1.25, 1, .7);
  GEO.long = new THREE.CapsuleGeometry(.1, .26, 4, 12); GEO.long.scale(1.25, 1, .45);
  GEO.bob = new THREE.SphereGeometry(.14, 24, 12, Math.PI / 2 + .75, TAU - 1.5, .9, 1.25); GEO.bob.scale(1, 1.05, 1.02);
  GEO.tail = new THREE.CapsuleGeometry(.04, .22, 4, 8); GEO.tail.translate(0, -.15, 0);
  GEO.ball = new THREE.SphereGeometry(.055, 12, 10);
  GEO.curl = new THREE.IcosahedronGeometry(.045, 1);
  GEO.skirt = new THREE.CylinderGeometry(.155, .26, .3, 22, 1, true); GEO.skirt.translate(0, -.15, 0);
  GEO.robe = new THREE.CylinderGeometry(.16, .3, .9, 22, 1, true); GEO.robe.translate(0, -.45, 0);
  GEO.collar = new THREE.TorusGeometry(.06, .018, 6, 16); GEO.collar.rotateX(Math.PI / 2);
  GEO.cuff = new THREE.CylinderGeometry(.052, .052, .05, 10);
  GEO.hood = new THREE.SphereGeometry(.12, 14, 10, 0, TAU, 0, Math.PI / 2); GEO.hood.scale(1.2, .7, 1);
  GEO.cap = new THREE.CylinderGeometry(.128, .13, .07, 20); GEO.brim = new THREE.BoxGeometry(.2, .015, .12);
  GEO.lens = new THREE.TorusGeometry(.025, .005, 6, 16);
  GEO.backText = new THREE.PlaneGeometry(.22, .07);
  GEO.ready = true; return GEO;
}
function jag(g, amt, seed) { // ragged hairline: push the lowest ring of vertices down by varying amounts
  g.computeBoundingBox(); const minY = g.boundingBox.min.y, p = g.attributes.position, r = mulberry32(seed * 977);
  const cache = new Map();
  for (let i = 0; i < p.count; i++) { const y = p.getY(i); const k = 1 - clamp((y - minY) / .03, 0, 1); if (k <= 0) continue; const key = Math.round(Math.atan2(p.getZ(i), p.getX(i)) * 40); if (!cache.has(key)) cache.set(key, r()); const d = cache.get(key) * amt * k; p.setY(i, y - d); p.setX(i, p.getX(i) * (1 + d * 1.2)); p.setZ(i, p.getZ(i) * (1 + d * 1.2)); }
  g.computeVertexNormals(); return g;
}
const _std = (c, o = {}) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: .75 }, o));
const OUTFITS = {
  lions: a => ({ torso: _std(a || '#7e1d20', { roughness: .55 }), arms: _std(a || '#7e1d20', { roughness: .55 }), pelvis: _std('#151518'), legs: _std('#151518', { roughness: .5 }), shins: _std('#151518', { roughness: .5 }), shoes: _std('#e8e6e0'), trim: _std('#d8b45a', { roughness: .4 }), back: 'LIONS', backCol: '#e8c86a' }),
  uniformF: a => ({ torso: _std(a || '#1f2740', { map: TEX.knit }), arms: _std(a || '#1f2740', { map: TEX.knit }), pelvis: _std('#1d2a44', { map: TEX.plaid }), skirt: _std('#ffffff', { map: TEX.plaid, side: THREE.DoubleSide, roughness: .85 }), legs: 'skin', shins: _std('#1a1d2a'), shoes: _std('#141414', { roughness: .35 }), trim: _std('#f1efe8') }),
  uniformM: a => ({ torso: _std(a || '#1d2640'), arms: _std(a || '#1d2640'), pelvis: _std('#4a4c52'), legs: _std('#4a4c52'), shins: _std('#4a4c52'), shoes: _std('#141414', { roughness: .35 }), trim: _std('#f1efe8'), tie: _std('#7e1d20') }),
  letterman: a => ({ torso: _std(a || '#6e1a1d', { roughness: .8 }), arms: _std('#cfc3a6', { roughness: .55 }), pelvis: _std('#ffffff', { map: TEX.denim, color: '#3a4f72' }), legs: _std('#3a4f72', { map: TEX.denim }), shins: _std('#3a4f72', { map: TEX.denim }), shoes: _std('#dad7cf'), trim: _std('#d8b45a'), back: 'LIONS', backCol: '#e6dcc4' }),
  hoodie: a => ({ torso: _std(a || '#5a5c60', { map: TEX.knit, roughness: .95 }), arms: _std(a || '#5a5c60', { map: TEX.knit, roughness: .95 }), pelvis: _std('#3a4f72', { map: TEX.denim }), legs: _std('#3a4f72', { map: TEX.denim }), shins: _std('#3a4f72', { map: TEX.denim }), shoes: _std('#2a2a2c'), trim: _std(a || '#5a5c60'), hood: true }),
  priest: () => ({ torso: _std('#121214'), arms: _std('#121214'), pelvis: _std('#121214'), robe: _std('#121214', { side: THREE.DoubleSide }), legs: _std('#121214'), shins: _std('#121214'), shoes: _std('#0a0a0a', { roughness: .3 }), trim: _std('#f4f4f0') }),
  coach: a => ({ torso: _std(a || '#1d2a44', { roughness: .5 }), arms: _std(a || '#1d2a44', { roughness: .5 }), pelvis: _std('#1d2a44', { roughness: .5 }), legs: _std('#1d2a44', { roughness: .5 }), shins: _std('#1d2a44', { roughness: .5 }), shoes: _std('#e8e6e0'), trim: _std('#e8e6e0'), back: 'COACH', backCol: '#e8e6e0' }),
  guard: () => ({ torso: _std('#3a4048'), arms: _std('#3a4048'), pelvis: _std('#16181c'), legs: _std('#16181c'), shins: _std('#16181c'), shoes: _std('#0a0a0a'), trim: _std('#c8a050', { metalness: .8, roughness: .3 }), cap: true }),
  apron: () => ({ torso: _std('#e8e4da'), arms: _std('#e8e4da'), pelvis: _std('#2a2a2e'), legs: _std('#2a2a2e'), shins: _std('#2a2a2e'), shoes: _std('#1a1a1a'), trim: _std('#7e1d20'), apron: _std('#f4f2ec') }),
  ghost: () => { const g = _std('#8e9196', { emissive: '#4a5260', emissiveIntensity: .35, roughness: 1, transparent: true }); return { torso: g, arms: g, pelvis: g, legs: g, shins: g, shoes: g, trim: g, skirt: g, back: 'LIONS', backCol: '#555', ghost: true }; }
};
class Character {
  constructor(spec) {
    charGeos();
    this.spec = spec = Object.assign({ fem: true, skin: SKINS[1], hair: 'long', hairCol: HAIRS[1], outfit: 'uniformF', accent: null, height: 1, build: 1, eye: '#3a2a1e', glasses: false }, spec);
    this.root = new THREE.Group(); this.root.name = spec.name || 'char';
    this.phase = Math.random() * TAU; this.speed = 0; this.mode = 'idle'; this.look = 0; this.t = Math.random() * 10; this.dance = 0; this.tailV = 0; this.tailA = 0;
    const o = OUTFITS[spec.outfit](spec.accent);
    this.o = o;
    const skin = _std(spec.skin, { roughness: .62 });
    const hairM = _std(spec.hairCol, { roughness: .5, metalness: .05 });
    if (o.ghost) { hairM.color.set('#0c0c0e'); skin.color.set('#b8bcc0'); skin.emissive = new THREE.Color('#3a4250'); skin.emissiveIntensity = .5; }
    this.mats = { skin, hairM };
    const legs = o.legs === 'skin' ? skin : o.legs, shins = o.shins === 'skin' ? skin : o.shins;
    const add = (parent, geo, mat, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m; };
    const B = this.bones = {};
    const fem = spec.fem, sw = fem ? 1 : 1.12;
    B.hips = new THREE.Group(); B.hips.position.y = .93; this.root.add(B.hips); this.hipY = .93;
    add(B.hips, fem ? GEO.pelvisF : GEO.pelvisM, o.pelvis).scale.set(1.15 * sw, 1, .82);
    B.spine = new THREE.Group(); B.spine.position.y = .02; B.hips.add(B.spine);
    const torso = add(B.spine, fem ? GEO.torsoF : GEO.torsoM, o.torso); torso.scale.set(1.22 * spec.build, 1, .78 * Math.min(1.2, spec.build));
    if (o.tie) add(B.spine, new THREE.BoxGeometry(.04, .22, .01), o.tie, 0, .33, .125);
    if (o.apron) { const ap = add(B.spine, new THREE.PlaneGeometry(.26, .55), o.apron, 0, .05, .14); ap.material.side = THREE.DoubleSide; }
    if (o.back) { const bt = textTex(o.back, { w: 256, h: 80, size: 54, color: o.backCol, letter: 6 }); const bm = new THREE.Mesh(GEO.backText, new THREE.MeshStandardMaterial({ map: bt, transparent: true, roughness: .8 })); bm.position.set(0, .34, -.128 * (fem ? 1 : 1.1)); bm.rotation.y = Math.PI; B.spine.add(bm); }
    add(B.spine, GEO.collar, o.trim, 0, .47 * (fem ? 1 : 1.03), 0).scale.set(1.3, 1, 1.1);
    if (o.hood) add(B.spine, GEO.hood, o.torso, 0, .45, -.07).rotation.x = -.3;
    add(B.spine, GEO.neck, skin, 0, .52, 0);
    B.head = new THREE.Group(); B.head.position.y = .62 * (fem ? 1 : 1.02); B.spine.add(B.head);
    const faceM = _std('#fff', { map: faceTex(spec.skin, o.ghost ? '#000' : spec.hairCol, fem ? '#b5575a' : '#a26a5e', spec.eye, fem), roughness: .6 });
    if (o.ghost) { faceM.map = faceTex('#8e9298', '#000', '#5a5a60', '#000', true); faceM.emissive = new THREE.Color('#40485a'); faceM.emissiveIntensity = .4; }
    this.mats.face = faceM;
    add(B.head, GEO.head, faceM, 0, .0, 0);
    add(B.head, GEO.ear, skin, -.104, -.005, -.005); add(B.head, GEO.ear, skin, .104, -.005, -.005);
    this.buildHair(B.head, hairM, spec.hair, o.ghost);
    if (o.cap) { add(B.head, GEO.cap, _std('#1c1f26'), 0, .09, -.005); add(B.head, GEO.brim, _std('#1c1f26'), 0, .065, .1); }
    if (spec.glasses) { const gm = _std('#1a1a1a', { metalness: .6, roughness: .3 }); add(B.head, GEO.lens, gm, -.037, .01, .108); add(B.head, GEO.lens, gm, .037, .01, .108); }
    // arms
    for (const s of [-1, 1]) {
      const sh = new THREE.Group(); sh.position.set(s * .2 * (fem ? .93 : 1.05) * spec.build, .43, 0); B.spine.add(sh);
      add(sh, GEO.shoulder, o.arms, 0, -.01, 0); add(sh, GEO.limbU, o.arms);
      const el = new THREE.Group(); el.position.y = -.29; sh.add(el);
      add(el, GEO.limbL, o.arms); add(el, GEO.cuff, o.trim, 0, -.24, 0);
      add(el, GEO.hand, skin, 0, -.3, 0);
      B[s < 0 ? 'armL' : 'armR'] = sh; B[s < 0 ? 'elbowL' : 'elbowR'] = el;
      sh.rotation.z = s * .07;
    }
    // legs
    for (const s of [-1, 1]) {
      const hp = new THREE.Group(); hp.position.set(s * .088 * sw, -.04, 0); B.hips.add(hp);
      add(hp, GEO.thigh, legs);
      const kn = new THREE.Group(); kn.position.y = -.43; hp.add(kn);
      add(kn, GEO.shin, shins);
      add(kn, GEO.foot, o.shoes, 0, -.43, .045);
      B[s < 0 ? 'legL' : 'legR'] = hp; B[s < 0 ? 'kneeL' : 'kneeR'] = kn;
    }
    if (o.skirt) { this.skirt = add(B.hips, GEO.skirt, o.skirt, 0, .02, 0); this.skirt.scale.set(1.05, 1, .85); }
    if (o.robe) { this.robe = add(B.hips, GEO.robe, o.robe, 0, .02, 0); this.robe.scale.set(1.05, 1, .85); }
    this.baseScale = spec.height * (fem ? 1 : 1.06); this.root.scale.setScalar(this.baseScale);
    this.root.traverse(m => { if (m.isMesh) m.userData.char = this; });
  }
  buildHair(head, m, style, ghost) {
    const add = (geo, x = 0, y = 0, z = 0) => { const h = new THREE.Mesh(geo, m); h.position.set(x, y, z); h.castShadow = true; head.add(h); return h; };
    if (style !== 'buzz') add(GEO.capTop, 0, .005, -.004); else { const c = add(GEO.capTop, 0, 0, -.003); c.scale.setScalar(.95); }
    if (style === 'buzz') return;
    add(GEO.capBack, 0, 0, -.004);
    if (style === 'short' || style === 'curly' || style === 'bun' || style === 'ponytail') add(GEO.fringe, 0, .004, 0);
    if (style === 'long' || ghost) {
      const l = add(GEO.long, 0, -.17, -.06); l.rotation.x = .08; l.scale.set(.85, 1, .9);
      const r = mulberry32(5); for (let i = 0; i < 11; i++) { const a = -2.5 + i / 10 * 5.0; if (Math.abs(a) > 2.25 && !ghost) continue; const lk = add(GEO.lock, Math.sin(a) * .108, -.02, -Math.cos(a) * .1 + .005); lk.rotation.set(-Math.cos(a) * .22, a, Math.sin(a) * .16); lk.scale.y = .85 + r() * .45; }
      add(GEO.fringe, 0, .006, .002).scale.set(1, 1.05, 1.02);
      if (ghost) { const veil = add(GEO.long, 0, -.07, .085); veil.scale.set(.75, .78, .32); }
    }
    if (style === 'bob') { add(GEO.bob, 0, -.03, -.004); add(GEO.fringe, 0, .006, .003); for (let i = 0; i < 9; i++) { const a = -2.3 + i / 8 * 4.6; const lk = add(GEO.lock, Math.sin(a) * .118, -.0, -Math.cos(a) * .11); lk.rotation.set(-Math.cos(a) * .3, a, Math.sin(a) * .3); lk.scale.set(1.1, .55, 1); } }
    if (style === 'ponytail') { add(GEO.ball, 0, .07, -.12).scale.setScalar(.6); this.tail = new THREE.Group(); this.tail.position.set(0, .07, -.13); head.add(this.tail); const t = new THREE.Mesh(GEO.tail, m); t.castShadow = true; t.scale.set(1.1, 1.3, .8); this.tail.add(t); }
    if (style === 'bun') add(GEO.ball, 0, .1, -.1).scale.setScalar(1.15);
    if (style === 'curly') { const r = mulberry32(11); for (let i = 0; i < 46; i++) { const th = r() * 1.9, ph = r() * TAU; if (Math.sin(ph) > .55 && th > .7) continue; const c = add(GEO.curl, -Math.cos(ph) * Math.sin(th) * .128, Math.cos(th) * .14 - .01, Math.sin(ph) * Math.sin(th) * .13 - .01); c.scale.setScalar(.8 + r() * .5); } }
  }
  setOpacity(a) { this.root.traverse(m => { if (m.isMesh) { m.material.transparent = a < 1 || m.material.transparent; m.material.opacity = a; } }); }
  dispose() { this.root.removeFromParent(); this.root.traverse(m => { if (m.isMesh) { m.material.dispose(); } }); }
  // mode: idle | walk | sit | dance | drive | ghost | talk | jump
  update(dt) {
    this.t += dt;
    const B = this.bones, sp = this.speed, t = this.t;
    let s = clamp(sp / 4, 0, 1.8);
    this.phase += dt * (sp > .05 ? (3.2 + sp * 1.35) : 0);
    const ph = this.phase;
    const R = (o, x = 0, y = 0, z = 0, k = 14) => { o.rotation.x = damp(o.rotation.x, x, k, dt); o.rotation.y = damp(o.rotation.y, y, k, dt); o.rotation.z = damp(o.rotation.z, z, k, dt); };
    let hy = this.hipY;
    if (this.mode === 'sit' || this.mode === 'drive') {
      hy = this.mode === 'drive' ? .5 : .5;
      R(B.legL, -1.5, 0, -.05); R(B.legR, -1.5, 0, .05); R(B.kneeL, 1.45); R(B.kneeR, 1.45);
      R(B.spine, this.mode === 'drive' ? -.12 : .02); R(B.head, Math.sin(t * .4) * .05, Math.sin(t * .23) * .25 * (this.mode === 'sit'), 0, 4);
      if (this.mode === 'drive') { R(B.armL, -1.15, 0, .22); R(B.armR, -1.15, 0, -.22); R(B.elbowL, -.5); R(B.elbowR, -.5); }
      else { R(B.armL, -.45, 0, .1); R(B.armR, -.45, 0, -.1); R(B.elbowL, -.8); R(B.elbowR, -.8); }
    } else if (this.mode === 'dance') {
      const b = this.dance; // beat position (float)
      const bar = Math.floor(b / 4) % 4, beat = b % 1, k = Math.sin(beat * Math.PI);
      const sway = Math.sin(b * Math.PI);
      hy = this.hipY - .06 - k * .05;
      B.hips.rotation.y = damp(B.hips.rotation.y, sway * .35, 12, dt);
      B.hips.position.x = damp(B.hips.position.x, sway * .06, 12, dt);
      const moves = [
        () => { R(B.armL, -2.6 + k * .3, 0, .4, 18); R(B.armR, -2.6 + k * .3, 0, -.4, 18); R(B.elbowL, -.3); R(B.elbowR, -.3); },
        () => { R(B.armL, -.2, 0, 1.3 + k * .3, 18); R(B.armR, -.2, 0, -1.3 - k * .3, 18); R(B.elbowL, -.2); R(B.elbowR, -.2); },
        () => { const l = Math.floor(b) % 2 ? 1 : 0; R(B.armL, l ? -2.8 : -.3, 0, .5, 18); R(B.armR, l ? -.3 : -2.8, 0, -.5, 18); R(B.elbowL, -.2); R(B.elbowR, -.2); },
        () => { R(B.armL, -1.3, .4, .2, 18); R(B.armR, -1.3, -.4, -.2, 18); R(B.elbowL, -1.6 * k); R(B.elbowR, -1.6 * (1 - k)); }
      ];
      moves[bar]();
      const st = Math.floor(b) % 2;
      R(B.legL, st ? -.25 * k : .05, 0, -.12 - (st ? 0 : .15 * k), 18); R(B.legR, st ? .05 : -.25 * k, 0, .12 + (st ? .15 * k : 0), 18);
      R(B.kneeL, .3 + (st ? .5 * k : .1), 0, 0, 18); R(B.kneeR, .3 + (st ? .1 : .5 * k), 0, 0, 18);
      R(B.spine, .05 + k * .08, -sway * .2, sway * .06, 18); R(B.head, -.05 + k * .1, sway * .25, 0, 18);
    } else if (this.mode === 'ghost') {
      hy = this.hipY + Math.sin(t * 1.2) * .02;
      R(B.legL, 0, 0, -.02); R(B.legR, 0, 0, .02); R(B.kneeL, 0); R(B.kneeR, 0);
      R(B.armL, .05, 0, .08); R(B.armR, .05, 0, -.08); R(B.elbowL, -.05); R(B.elbowR, -.05);
      R(B.spine, .12); R(B.head, .45, 0, .25 + Math.sin(t * .7) * .05, 3);
    } else if (this.mode === 'jump') {
      R(B.legL, -.7, 0, -.05, 10); R(B.legR, -.2, 0, .05, 10); R(B.kneeL, 1.1, 0, 0, 10); R(B.kneeR, .5, 0, 0, 10);
      R(B.armL, -.9, 0, .5, 10); R(B.armR, .4, 0, -.5, 10); R(B.elbowL, -.6); R(B.elbowR, -.3); R(B.spine, .1);
    } else {
      // walk / run cycle blended with idle
      const A = lerp(.42, .8, clamp(s - .4, 0, 1)) * Math.min(1, s * 3);
      const swingL = -A * Math.sin(ph), swingR = -A * Math.sin(ph + Math.PI);
      const kneeK = lerp(.55, 1.4, clamp(s - .4, 0, 1)) * Math.min(1, s * 3);
      R(B.legL, swingL, 0, -.03, 20); R(B.legR, swingR, 0, .03, 20);
      R(B.kneeL, .05 + kneeK * Math.max(0, -Math.cos(ph)), 0, 0, 20); R(B.kneeR, .05 + kneeK * Math.max(0, Math.cos(ph)), 0, 0, 20);
      const Aa = lerp(.35, .9, clamp(s - .4, 0, 1)) * Math.min(1, s * 3);
      const idle = 1 - Math.min(1, s * 3);
      const breathe = Math.sin(t * 1.6) * .03 * idle;
      const talk = this.mode === 'talk' ? 1 : 0;
      R(B.armL, Aa * Math.sin(ph) + breathe - talk * (.35 + Math.sin(t * 2.3) * .2) + idle * .05, 0, .11 + idle * .06, 18);
      R(B.armR, Aa * Math.sin(ph + Math.PI) + breathe - talk * (.2 + Math.sin(t * 1.7 + 1) * .25) + idle * .05, 0, -.11 - idle * .06, 18);
      R(B.elbowL, -.22 - s * .55 - talk * .6 - idle * .1, 0, 0, 18); R(B.elbowR, -.22 - s * .55 - talk * .7 - idle * .1, 0, 0, 18);
      hy = this.hipY - .02 * Math.min(1, s * 2) + Math.cos(ph * 2) * .028 * Math.min(1, s * 2) + breathe * .2;
      R(B.spine, .04 + clamp(s - .5, 0, 1) * .12 + Math.sin(t * 1.6) * .01 * idle, -Math.sin(ph) * .08 * Math.min(1, s * 2), 0, 12);
      B.hips.rotation.y = damp(B.hips.rotation.y, Math.sin(ph) * .12 * Math.min(1, s * 2), 12, dt);
      B.hips.position.x = damp(B.hips.position.x, 0, 8, dt);
      const lookY = clamp(this.look, -1, 1) + Math.sin(t * .3) * .15 * idle;
      R(B.head, -.03 + Math.sin(t * .5) * .02, lookY, Math.sin(t * .27) * .03 * idle, 5);
    }
    B.hips.position.y = damp(B.hips.position.y, hy, 16, dt);
    // ponytail pendulum
    if (this.tail) {
      const acc = (this.mode === 'dance' ? Math.cos(this.dance * Math.PI * 2) * 8 : Math.cos(ph * 2) * s * 6);
      this.tailV += (-this.tailA * 40 - this.tailV * 5 + acc) * dt; this.tailA += this.tailV * dt;
      this.tail.rotation.x = .35 + clamp(this.tailA, -.5, .5) + s * .25; this.tail.rotation.z = clamp(this.tailA, -.5, .5) * .5;
    }
    if (this.skirt) this.skirt.rotation.x = damp(this.skirt.rotation.x, -s * .1, 6, dt);
  }
}

/* ---------- cast ---------- */
const CAST = {
  anya: { name: 'Anya', full: 'Anya', role: 'Captain of the Lions', spec: { fem: true, skin: '#ecc8ac', hair: 'ponytail', hairCol: '#7a5232', outfit: 'lions', eye: '#3e5a66' } },
  elise: { name: 'Elise', full: 'Elise', role: 'Lions dancer', spec: { fem: true, skin: '#c99a76', hair: 'long', hairCol: '#1d1511', outfit: 'uniformF', accent: '#33293d', eye: '#4a2e1c' } },
  steven: { name: 'Steven', full: 'Steven', role: 'Varsity, #12', spec: { fem: false, skin: '#d9a888', hair: 'short', hairCol: '#2a1c14', outfit: 'letterman', eye: '#3a2a1e', build: 1.08 } },
  father: { name: 'Father Franklin', role: 'Chaplain', spec: { fem: false, skin: '#e2bea0', hair: 'buzz', hairCol: '#8e8a84', outfit: 'priest', height: 1.02, eye: '#4a5a6a' } },
  coach: { name: 'Coach Reyes', role: 'Dance coach', spec: { fem: true, skin: '#b07a54', hair: 'bun', hairCol: '#1a1410', outfit: 'coach', eye: '#2a1a10', build: 1.05 } },
  ruth: { name: 'Ruth Kowalski', role: 'Editor, The Agatha Herald', spec: { fem: true, skin: '#f0d0b8', hair: 'bob', hairCol: '#a8461f', outfit: 'uniformF', accent: '#2f4a36', glasses: true, eye: '#3a5a3a' } },
  dale: { name: 'Dale', role: "Owner, Dale's Diner", spec: { fem: false, skin: '#d09c7c', hair: 'buzz', hairCol: '#5a4a3a', outfit: 'apron', build: 1.25, eye: '#3a2a1e' } },
  pruitt: { name: 'Mr. Pruitt', role: 'Campus security', spec: { fem: false, skin: '#9a6a4c', hair: 'buzz', hairCol: '#222', outfit: 'guard', build: 1.15, eye: '#2a1a10' } },
  marisol: { name: 'Marisol', role: 'Lions dancer', spec: { fem: true, skin: '#c08a64', hair: 'long', hairCol: '#2a1a10', outfit: 'lions', eye: '#2a1a10' } },
  bridget: { name: 'Bridget', role: 'Lions dancer', spec: { fem: true, skin: '#f3d6c1', hair: 'ponytail', hairCol: '#d8b878', outfit: 'lions', eye: '#4a6a8a' } },
  tasha: { name: 'Tasha', role: 'Lions dancer', spec: { fem: true, skin: '#6e4630', hair: 'curly', hairCol: '#120c0a', outfit: 'lions', eye: '#2a1a10' } },
  nora: { name: 'Nora', role: 'Lions dancer, sophomore', spec: { fem: true, skin: '#e8bfa0', hair: 'bun', hairCol: '#5a3a22', outfit: 'lions', eye: '#3a4a2a' } },
  ghost: { name: '???', role: '', spec: { fem: true, skin: '#aaa', hair: 'long', hairCol: '#0c0c0e', outfit: 'ghost', height: 1.0 } }
};
for (const [id, c] of Object.entries(CAST)) c.spec.real = id;
