
/* ============================== input ============================== */
const Input = { keys: {}, pressed: {}, dx: 0, dy: 0, locked: false, drag: false, joy: { x: 0, y: 0, active: false }, wheel: 0, block: false };
addEventListener('keydown', e => {
  if (e.target && e.target.tagName === 'INPUT') return;
  if (!Input.keys[e.code]) Input.pressed[e.code] = true;
  Input.keys[e.code] = true;
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.code)) e.preventDefault();
});
addEventListener('keyup', e => { Input.keys[e.code] = false; });
addEventListener('blur', () => { Input.keys = {}; });
Input.hit = c => { if (Input.pressed[c]) { Input.pressed[c] = false; return true; } return false; };
Input.endFrame = () => { Input.pressed = {}; Input.dx = 0; Input.dy = 0; Input.wheel = 0; };
canvas.addEventListener('mousedown', e => { Input.drag = true; Input.pressed['Mouse0'] = true; if (Game.state === 'play' && !Input.locked && !isTouch) { const r = canvas.requestPointerLock && canvas.requestPointerLock(); if (r && r.catch) r.catch(() => { }); } });
addEventListener('mouseup', () => { Input.drag = false; });
addEventListener('mousemove', e => { if (Input.locked || (Input.drag && Game.state === 'play')) { Input.dx += e.movementX || 0; Input.dy += e.movementY || 0; } });
addEventListener('wheel', e => { Input.wheel += Math.sign(e.deltaY); }, { passive: true });
document.addEventListener('pointerlockchange', () => { Input.locked = document.pointerLockElement === canvas; });
// touch
(function touch() {
  const joy = $('#joy'), knob = joy.querySelector('i'), look = $('#touch-look');
  let jid = null, lid = null, jc = { x: 0, y: 0 }, lp = { x: 0, y: 0 };
  joy.addEventListener('touchstart', e => { const t = e.changedTouches[0]; jid = t.identifier; const r = joy.getBoundingClientRect(); jc = { x: r.left + r.width / 2, y: r.top + r.height / 2 }; Input.joy.active = true; e.preventDefault(); }, { passive: false });
  look.addEventListener('touchstart', e => { const t = e.changedTouches[0]; lid = t.identifier; lp = { x: t.clientX, y: t.clientY }; e.preventDefault(); }, { passive: false });
  addEventListener('touchmove', e => { for (const t of e.changedTouches) { if (t.identifier === jid) { let dx = (t.clientX - jc.x) / 55, dy = (t.clientY - jc.y) / 55; const l = Math.hypot(dx, dy); if (l > 1) { dx /= l; dy /= l; } Input.joy.x = dx; Input.joy.y = dy; knob.style.transform = `translate(${dx * 40}px,${dy * 40}px)`; } if (t.identifier === lid) { Input.dx += (t.clientX - lp.x) * 1.6; Input.dy += (t.clientY - lp.y) * 1.6; lp = { x: t.clientX, y: t.clientY }; } } }, { passive: true });
  const end = e => { for (const t of e.changedTouches) { if (t.identifier === jid) { jid = null; Input.joy.x = Input.joy.y = 0; Input.joy.active = false; knob.style.transform = ''; } if (t.identifier === lid) lid = null; } };
  addEventListener('touchend', end); addEventListener('touchcancel', end);
  $$('#touch .tbtns button').forEach(b => { const k = b.dataset.k; b.addEventListener('touchstart', e => { Input.keys[k] = true; Input.pressed[k] = true; e.preventDefault(); }, { passive: false }); b.addEventListener('touchend', () => { Input.keys[k] = false; }); });
})();

/* ============================== camera rig ============================== */
const Cam = { yaw: Math.PI, pitch: .18, dist: 4.4, curDist: 4.4, shoulder: .45, override: null, shake: 0, pos: new THREE.Vector3(), look: new THREE.Vector3(), fovKick: 0, idleT: 0 };
const _dir = new THREE.Vector3(), _tgt = new THREE.Vector3(), _des = new THREE.Vector3(), _right = new THREE.Vector3();
function updateCamera(dt) {
  if (Cam.override) {
    const o = Cam.override;
    const k = o.snap ? 1 : 1 - Math.exp(-(o.speed || 3) * dt);
    Cam.pos.lerp(o.pos, k); Cam.look.lerp(o.look, k); o.snap = false;
    camera.position.copy(Cam.pos); camera.lookAt(Cam.look);
    if (o.roll) camera.rotateZ(o.roll);
  } else {
    const sens = .0024 * settings.sens;
    Cam.yaw -= Input.dx * sens; Cam.pitch += Input.dy * sens * (settings.invert ? -1 : 1);
    if (Input.wheel) Cam.dist = clamp(Cam.dist + Input.wheel * .5, 2.4, 8);
    const car = Player.car;
    if (car) {
      if (Math.abs(Input.dx) + Math.abs(Input.dy) > 0) Cam.idleT = 0; else Cam.idleT += dt;
      if (Cam.idleT > 1.2 && Math.abs(car.speed) > 2) { Cam.yaw = dampAngle(Cam.yaw, car.yaw + (car.speed < 0 ? Math.PI : 0), 2.5, dt); Cam.pitch = damp(Cam.pitch, .16, 2, dt); }
    }
    Cam.pitch = clamp(Cam.pitch, -.55, 1.1);
    const dist = car ? 8 : Game.photo ? .05 : Cam.dist;
    const p = Player.pos;
    _tgt.set(p.x, p.y + (car ? 1.6 : Game.photo ? 1.58 : 1.55), p.z);
    _dir.set(Math.sin(Cam.yaw) * Math.cos(Cam.pitch), -Math.sin(Cam.pitch), Math.cos(Cam.yaw) * Math.cos(Cam.pitch));
    _right.set(-Math.cos(Cam.yaw), 0, Math.sin(Cam.yaw));
    const sh = car || Game.photo ? 0 : Cam.shoulder;
    // occlusion
    const back = _des.copy(_dir).multiplyScalar(-1).addScaledVector(_right, sh / dist).normalize();
    const hit = rayBoxes(_tgt, back, dist + .3);
    const want = Game.photo ? .05 : Math.max(.6, hit * (dist + .3) - .3);
    Cam.curDist = want < Cam.curDist ? want : damp(Cam.curDist, want, 4, dt);
    camera.position.copy(_tgt).addScaledVector(back, Cam.curDist);
    const gy = heightAt(camera.position.x, camera.position.z) + .35; if (camera.position.y < gy) camera.position.y = gy;
    Cam.look.copy(_tgt).addScaledVector(_right, sh * .5).addScaledVector(_dir, 2);
    camera.lookAt(Cam.look);
    Cam.pos.copy(camera.position);
  }
  if (Cam.shake > 0) { Cam.shake = Math.max(0, Cam.shake - dt); const s = Cam.shake * .06; camera.position.x += (Math.random() - .5) * s; camera.position.y += (Math.random() - .5) * s; }
  const targetFov = settings.fov + Cam.fovKick;
  if (Math.abs(camera.fov - targetFov) > .05) { camera.fov = damp(camera.fov, targetFov, 4, dt); camera.updateProjectionMatrix(); }
}
function camOverride(pos, look, speed = 3, snap = false) { Cam.override = { pos: pos.clone ? pos.clone() : new THREE.Vector3(...pos), look: look.clone ? look.clone() : new THREE.Vector3(...look), speed, snap }; if (snap) { Cam.pos.copy(Cam.override.pos); Cam.look.copy(Cam.override.look); } }
function camRelease() { if (Cam.override) { // keep player camera behind current view
  const d = new THREE.Vector3().subVectors(Cam.look, Cam.pos); Cam.yaw = Math.atan2(d.x, d.z); Cam.override = null; } }

/* ============================== vehicles ============================== */
const CAR_GEO = {};
function carGeos() {
  if (CAR_GEO.ready) return CAR_GEO;
  const ext = (pts, depth, bevel = .05) => { const s = new THREE.Shape(); s.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) s.lineTo(pts[i][0], pts[i][1]); s.closePath(); const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: bevel > 0, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 3, curveSegments: 4 }); g.translate(0, 0, -depth / 2); g.rotateY(-Math.PI / 2); return g; };
  // profile: x = length axis (front at +x before rotation), y = height
  CAR_GEO.body = ext([[-2.3, .32], [2.28, .32], [2.34, .55], [2.25, .82], [1.25, .98], [-1.45, 1.0], [-2.15, .93], [-2.32, .75]], 1.66, .08);
  CAR_GEO.glass = ext([[-1.38, .96], [1.18, .96], [.48, 1.38], [-.9, 1.4]], 1.5, .05);
  CAR_GEO.roof = ext([[-.98, 1.38], [.5, 1.36], [.44, 1.45], [-.92, 1.46]], 1.5, .05);
  CAR_GEO.tire = new THREE.CylinderGeometry(.34, .34, .26, 18); CAR_GEO.tire.rotateZ(Math.PI / 2);
  CAR_GEO.rim = new THREE.CylinderGeometry(.2, .2, .27, 10); CAR_GEO.rim.rotateZ(Math.PI / 2);
  CAR_GEO.ready = true; return CAR_GEO;
}
const carMats = { glass: null, tire: null, rim: null, head: null, tail: null, trim: null };
class Car {
  constructor(color, x, z, yaw, { ai = false, name = 'Sedan' } = {}) {
    carGeos();
    if (!carMats.glass) { carMats.glass = new THREE.MeshStandardMaterial({ color: 0x0a0e12, roughness: .05, metalness: .9 }); carMats.tire = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: .9 }); carMats.rim = new THREE.MeshStandardMaterial({ color: 0xb8bcc0, roughness: .25, metalness: 1 }); carMats.trim = new THREE.MeshStandardMaterial({ color: 0x1a1b1d, roughness: .5 }); }
    this.name = name;
    this.paint = new THREE.MeshStandardMaterial({ color, roughness: .28, metalness: .55, envMapIntensity: 1.3 });
    this.head = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff2d0, emissiveIntensity: .1 });
    this.tail = new THREE.MeshStandardMaterial({ color: 0x5a0a0a, emissive: 0xff1a10, emissiveIntensity: .2 });
    const g = this.group = new THREE.Group();
    const add = (geo, mat, px = 0, py = 0, pz = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(px, py, pz); m.castShadow = true; m.receiveShadow = true; g.add(m); return m; };
    add(CAR_GEO.body, this.paint); add(CAR_GEO.glass, carMats.glass); add(CAR_GEO.roof, this.paint);
    add(new THREE.BoxGeometry(1.86, .22, .2), carMats.trim, 0, .42, 2.36); add(new THREE.BoxGeometry(1.86, .22, .2), carMats.trim, 0, .42, -2.36);
    add(new THREE.BoxGeometry(1.0, .16, .06), carMats.trim, 0, .7, 2.37);
    for (const s of [-1, 1]) { add(new THREE.BoxGeometry(.34, .14, .06), this.head, s * .62, .72, 2.33); add(new THREE.BoxGeometry(.34, .14, .06), this.tail, s * .64, .78, -2.33); add(new THREE.BoxGeometry(.08, .1, .2), this.paint, s * .9, 1.0, 1.0); add(new THREE.BoxGeometry(.03, .05, .9), carMats.rim, s * .91, .7, -.2); }
    this.wheels = [];
    for (const [wx, wz] of [[.8, 1.42], [-.8, 1.42], [.8, -1.38], [-.8, -1.38]]) { const w = new THREE.Group(); w.position.set(wx, .34, wz); const t = new THREE.Mesh(CAR_GEO.tire, carMats.tire); t.castShadow = true; w.add(t); w.add(new THREE.Mesh(CAR_GEO.rim, carMats.rim)); g.add(w); this.wheels.push(w); }
    this.pos = new THREE.Vector3(x, heightAt(x, z), z); this.yaw = yaw; this.speed = 0; this.steer = 0; this.spin = 0; this.ai = ai; this.pitch = 0; this.roll = 0;
    this.seat = new THREE.Vector3(.38, .12, -.15);
    g.position.copy(this.pos); g.rotation.y = yaw;
    World.group.add(g); World.vehicles.push(this);
  }
  circles() { const f = Math.sin(this.yaw), c = Math.cos(this.yaw); return [-1.45, 0, 1.45].map(o => ({ x: this.pos.x + f * o, z: this.pos.z + c * o, r: .98 })); }
  drive(dt, inp) {
    const fwd = inp.throttle;
    if (fwd > 0) this.speed += (this.speed < 0 ? 16 : lerp(10, 4, clamp(this.speed / 30, 0, 1))) * dt * fwd;
    else if (fwd < 0) this.speed -= (this.speed > 0 ? 18 : 6) * dt * -fwd;
    else this.speed -= Math.sign(this.speed) * Math.min(Math.abs(this.speed), (1.5 + Math.abs(this.speed) * .2) * dt);
    if (inp.brake) this.speed = damp(this.speed, 0, 3.5, dt);
    this.speed = clamp(this.speed, -9, 31);
    const maxSteer = lerp(.6, .16, clamp(Math.abs(this.speed) / 28, 0, 1));
    this.steer = damp(this.steer, inp.steer * maxSteer, 7, dt);
    this.yaw += this.speed / 2.8 * Math.tan(this.steer) * dt;
    this.step(dt, true);
  }
  step(dt, collide) {
    const f = Math.sin(this.yaw), c = Math.cos(this.yaw);
    this.pos.x += f * this.speed * dt; this.pos.z += c * this.speed * dt;
    if (collide) {
      let mx = 0, mz = 0, n = 0;
      for (const ci of this.circles()) { const p = { x: ci.x, z: ci.z }; resolveCircle(p, ci.r, this.pos.y + .2, 1.4, .35); if (p.x !== ci.x || p.z !== ci.z) { mx += p.x - ci.x; mz += p.z - ci.z; n++; } }
      for (const v of World.vehicles) { if (v === this) continue; if (Math.abs(v.pos.x - this.pos.x) > 7 || Math.abs(v.pos.z - this.pos.z) > 7) continue; for (const a of this.circles()) for (const b of v.circles()) { const dx = a.x - b.x, dz = a.z - b.z, d = Math.hypot(dx, dz), m = a.r + b.r; if (d < m && d > 1e-4) { mx += dx / d * (m - d) * .5; mz += dz / d * (m - d) * .5; n++; } } }
      if (n) { this.pos.x += mx / Math.max(1, n * .7); this.pos.z += mz / Math.max(1, n * .7); if (Math.abs(this.speed) > 4) { AudioFX.thud(); Cam.shake = Math.min(.5, Math.abs(this.speed) / 40); } this.speed *= -.25; }
      this.pos.x = clamp(this.pos.x, -470, 470); this.pos.z = clamp(this.pos.z, -470, 470);
    }
    // ground following
    const gh = (x, z) => { let h = heightAt(x, z); for (const fl of FLOORS) if (inRect(x, z, fl)) h = Math.max(h, 0); return h; };
    const hf = gh(this.pos.x + f * 1.4, this.pos.z + c * 1.4), hb = gh(this.pos.x - f * 1.4, this.pos.z - c * 1.4);
    const hl = gh(this.pos.x + c * .8, this.pos.z - f * .8), hr = gh(this.pos.x - c * .8, this.pos.z + f * .8);
    this.pos.y = damp(this.pos.y, (hf + hb) / 2, 14, dt);
    this.pitch = damp(this.pitch, Math.atan2(hb - hf, 2.8), 10, dt); this.roll = damp(this.roll, Math.atan2(hr - hl, 1.6), 10, dt);
    this.spin += this.speed * dt / .34;
    this.wheels.forEach((w, i) => { w.rotation.set(this.spin, i < 2 ? this.steer : 0, 0, 'YXZ'); });
    this.group.position.copy(this.pos); this.group.rotation.set(this.pitch, this.yaw, this.roll, 'YXZ');
  }
  aiUpdate(dt) {
    const a = this.ai; const tgtX = a.dir > 0 ? 300 : -380; const laneZ = 140 + a.dir * 2.3;
    const yawT = a.dir > 0 ? Math.PI / 2 : -Math.PI / 2; void tgtX;
    this.yaw = dampAngle(this.yaw, yawT - clamp((laneZ - this.pos.z) * .08 * a.dir, -.3, .3), 3, dt);
    // brake for anything ahead
    let block = false; const f = Math.sin(this.yaw), c = Math.cos(this.yaw);
    const ahead = (x, z, r) => { const dx = x - this.pos.x, dz = z - this.pos.z, fwd = dx * f + dz * c, side = Math.abs(dx * c - dz * f); return fwd > 0 && fwd < 14 && side < r; };
    if (!Player.car && ahead(Player.pos.x, Player.pos.z, 2.2)) block = true;
    for (const v of World.vehicles) if (v !== this && ahead(v.pos.x, v.pos.z, 2.4)) block = true;
    for (const n of NPCList) if (n.visible && ahead(n.pos.x, n.pos.z, 2)) block = true;
    const target = block ? 0 : a.cruise;
    this.speed = damp(this.speed, target, block ? 3 : .6, dt);
    if (block && !a.honked && this.speed < 3 && Math.hypot(Player.pos.x - this.pos.x, Player.pos.z - this.pos.z) < 16) { a.honked = true; AudioFX.tone(392, .25, { type: 'square', gain: .05 }); AudioFX.tone(330, .3, { type: 'square', gain: .05, when: .05 }); setTimeout(() => a.honked = false, 4000); }
    this.step(dt, false);
    if ((a.dir > 0 && this.pos.x > 295) || (a.dir < 0 && this.pos.x < -375)) { a.dir *= -1; this.pos.z = 140 + a.dir * 2.3; this.yaw = a.dir > 0 ? Math.PI / 2 : -Math.PI / 2; }
  }
  lights(on) { this.head.emissiveIntensity = on ? 3 : .1; this.tail.emissiveIntensity = on ? 1.6 : .2; }
}

/* ============================== player ============================== */
const Player = { char: null, pos: new THREE.Vector3(0, 0, 20), vel: new THREE.Vector3(), yaw: Math.PI, vy: 0, grounded: true, car: null, stepPh: 0, frozen: false, sprint: 0, inside: null };
function makeCharacter(spec) { const m = spec.real && ASSETS.models[spec.real]; return m ? new RealCharacter(m, spec) : new Character(spec); }
function setPlayerChar(spec) {
  if (Player.char) Player.char.dispose();
  Player.char = makeCharacter(spec); scene.add(Player.char.root);
}
function placePlayer(x, z, yaw = Math.PI) { if (Player.car) exitCar(true); Player.pos.set(x, groundAt(x, z), z); Player.vel.set(0, 0, 0); Player.yaw = yaw; Cam.yaw = yaw; Player.vy = 0; if (Player.char) { Player.char.root.position.copy(Player.pos); Player.char.root.rotation.y = yaw; } }
function groundAt(x, z) { let h = heightAt(x, z); for (const c of queryCol(x, z, .5)) if (!c.r && c.maxY < 1.2 && x >= c.minX && x <= c.maxX && z >= c.minZ && z <= c.maxZ) h = Math.max(h, c.maxY); return h; }
function nearestCar(r = 3.4) { let best = null, bd = r; for (const v of World.vehicles) { if (v.ai) continue; const d = Math.hypot(v.pos.x - Player.pos.x, v.pos.z - Player.pos.z); if (d < bd) { bd = d; best = v; } } return best; }
function enterCar(v) {
  Player.car = v; v.driver = Player;
  const ch = Player.char; v.group.add(ch.root); ch.root.position.copy(v.seat); ch.root.rotation.set(0, 0, 0); ch.mode = 'drive'; ch.speed = 0;
  ch.root.scale.multiplyScalar(.96);
  AudioFX.noise(.15, { freq: 300, q: 1, gain: .3 }); AudioFX.tone(110, .4, { type: 'sawtooth', gain: .08, freqEnd: 60 });
  Game.onEvent('enterCar', v);
}
function exitCar(force = false) {
  const v = Player.car; if (!v) return;
  if (!force && Math.abs(v.speed) > 4) return;
  const ch = Player.char; scene.add(ch.root); ch.root.scale.setScalar(ch.spec.height * (ch.spec.fem ? 1 : 1.06)); ch.mode = 'idle';
  const lx = Math.cos(v.yaw), lz = -Math.sin(v.yaw);
  Player.pos.set(v.pos.x + lx * 1.7, 0, v.pos.z + lz * 1.7);
  const p = { x: Player.pos.x, z: Player.pos.z }; resolveCircle(p, .35, v.pos.y, 1.7); Player.pos.x = p.x; Player.pos.z = p.z; Player.pos.y = groundAt(p.x, p.z);
  Player.yaw = v.yaw; v.driver = null; Player.car = null; v.speed *= .3; v.lights(false);
  AudioFX.setEngine(false); World.spotCar.intensity = 0;
  AudioFX.noise(.15, { freq: 300, q: 1, gain: .3 });
}
function updatePlayer(dt) {
  const ch = Player.char; if (!ch) return;
  const K = Input.keys;
  let ix = (K.KeyD || K.ArrowRight ? 1 : 0) - (K.KeyA || K.ArrowLeft ? 1 : 0), iy = (K.KeyW || K.ArrowUp ? 1 : 0) - (K.KeyS || K.ArrowDown ? 1 : 0);
  if (Input.joy.active) { ix += Input.joy.x; iy -= Input.joy.y; }
  if (Player.frozen || Game.uiBlock) { ix = 0; iy = 0; }
  if (Player.car) {
    const v = Player.car;
    v.drive(dt, { throttle: clamp(iy, -1, 1), steer: clamp(-ix, -1, 1), brake: !!K.Space && !Game.uiBlock });
    Player.pos.copy(v.pos); Player.yaw = v.yaw;
    AudioFX.setEngine(true, clamp(Math.abs(v.speed) / 30, 0, 1));
    const on = TOD.night > .3; v.lights(on);
    const sc = World.spotCar; sc.intensity = on ? 120 : 0;
    if (on) { const f = Math.sin(v.yaw), c = Math.cos(v.yaw); sc.position.set(v.pos.x + f * 2.3, v.pos.y + .8, v.pos.z + c * 2.3); sc.target.position.set(v.pos.x + f * 14, v.pos.y - .5, v.pos.z + c * 14); sc.target.updateMatrixWorld(); }
    Cam.fovKick = damp(Cam.fovKick, clamp(Math.abs(v.speed) / 30, 0, 1) * 10, 3, dt);
    ch.update(dt);
    return;
  }
  const f = new THREE.Vector3(Math.sin(Cam.yaw), 0, Math.cos(Cam.yaw)), r = new THREE.Vector3(-Math.cos(Cam.yaw), 0, Math.sin(Cam.yaw));
  const mv = f.multiplyScalar(iy).addScaledVector(r, ix); const ml = Math.min(1, mv.length()); if (ml > 0) mv.normalize();
  const sprint = (K.ShiftLeft || K.ShiftRight) && ml > .1;
  const speed = (Player.inside ? 3.4 : 4.4) * (sprint ? 1.62 : 1) * ml;
  const accel = Player.grounded ? 12 : 3;
  Player.vel.x = damp(Player.vel.x, mv.x * speed, accel, dt); Player.vel.z = damp(Player.vel.z, mv.z * speed, accel, dt);
  Player.pos.x += Player.vel.x * dt; Player.pos.z += Player.vel.z * dt;
  const p = Player.pos;
  const ground = resolveCircle(p, .34, p.y, 1.7, .55);
  // vehicles are solid
  for (const v of World.vehicles) { if (Math.abs(v.pos.x - p.x) > 5 || Math.abs(v.pos.z - p.z) > 5) continue; for (const c of v.circles()) { const dx = p.x - c.x, dz = p.z - c.z, d = Math.hypot(dx, dz), m = c.r + .34; if (d < m && d > 1e-4) { p.x = c.x + dx / d * m; p.z = c.z + dz / d * m; } } }
  for (const n of NPCList) { if (!n.visible || n.noCollide) continue; const dx = p.x - n.pos.x, dz = p.z - n.pos.z, d = Math.hypot(dx, dz); if (d < .62 && d > 1e-4) { p.x = n.pos.x + dx / d * .62; p.z = n.pos.z + dz / d * .62; } }
  p.x = clamp(p.x, -460, 460); p.z = clamp(p.z, -460, 460);
  if (Math.hypot(p.x - LAKE.x, p.z - LAKE.z) < LAKE.r - 2 && !FLOORS.some(fl => inRect(p.x, p.z, fl))) { const a = Math.atan2(p.z - LAKE.z, p.x - LAKE.x); p.x = LAKE.x + Math.cos(a) * (LAKE.r - 2); p.z = LAKE.z + Math.sin(a) * (LAKE.r - 2); }
  // vertical
  if (Player.grounded && Input.hit('Space') && !Game.uiBlock) { Player.vy = 5.2; Player.grounded = false; AudioFX.step(surfaceAt(p.x, p.z), 1.3); }
  Player.vy -= 16 * dt; p.y += Player.vy * dt;
  if (p.y <= ground) { if (!Player.grounded && Player.vy < -4) AudioFX.step(surfaceAt(p.x, p.z), 1.5); p.y = ground; Player.vy = 0; Player.grounded = true; }
  else if (Player.grounded && p.y - ground < .6 && Player.vy <= 0) { p.y = damp(p.y, ground, 20, dt); if (Math.abs(p.y - ground) < .02) p.y = ground; Player.vy = 0; }
  else Player.grounded = false;
  const hs = Math.hypot(Player.vel.x, Player.vel.z);
  if (hs > .3) Player.yaw = dampAngle(Player.yaw, Math.atan2(Player.vel.x, Player.vel.z), 12, dt);
  ch.speed = hs; ch.mode = Player.grounded ? 'walk' : 'jump';
  if (Game.talking) ch.mode = 'talk';
  ch.root.position.copy(p); ch.root.rotation.y = Player.yaw;
  // footsteps
  const prev = Math.floor(ch.phase / Math.PI); ch.update(dt);
  if (Player.grounded && hs > .5 && Math.floor(ch.phase / Math.PI) !== prev) AudioFX.step(surfaceAt(p.x, p.z), clamp(hs / 5, .5, 1.3));
  Cam.fovKick = damp(Cam.fovKick, sprint ? 6 : 0, 3, dt);
  // inside detection (for ambience and light)
  Player.inside = null; for (const fl of FLOORS) if (inRect(p.x, p.z, fl)) { Player.inside = fl; break; }
}
