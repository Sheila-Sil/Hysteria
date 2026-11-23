
/* ============================== NPCs ============================== */
const NPCList = [], NPCS = {};
const WANDER = [[0, -18], [0, 12], [0, 40], [-20, 0], [20, 0], [-40, 2], [40, -2], [-30, -24], [30, -24], [-14, 46], [30, 44], [62, 30], [-46, 20], [-10, -24], [10, -24], [-25, 55], [50, 52], [-6, 22], [8, 30], [-35, 30], [36, 14], [-20, -14], [20, 14]];
class NPC {
  constructor(id, def, opts = {}) {
    this.id = id; this.def = def; this.name = def.name; this.role = def.role || '';
    this.char = new Character(def.spec); scene.add(this.char.root);
    this.pos = new THREE.Vector3(); this.yaw = 0; this.target = null; this.wait = rr(1, 5); this.visible = true; this.sit = false; this.seatY = null;
    this.walkSpeed = opts.speed || rr(1.2, 1.5); this.wander = !!opts.wander; this.talkable = opts.talkable !== false; this.story = !!opts.story; this.lines = opts.lines || null; this.lineIdx = 0;
    this.pending = null; this.onArrive = null; this.stuckT = 0; this.lookAtPlayer = opts.lookAtPlayer !== false;
    NPCList.push(this); NPCS[id] = this;
  }
  place(x, z, yaw = 0, { sit = false, y = null, wander = null } = {}) {
    this.pos.set(x, y != null ? y : groundAt(x, z), z); this.yaw = yaw; this.sit = sit; this.seatY = sit ? (y != null ? y : this.pos.y) : null; this.target = null; this.onArrive = null;
    if (wander != null) this.wander = wander;
    this.char.root.position.copy(this.pos); this.char.root.rotation.y = yaw; this.char.mode = sit ? 'sit' : 'idle';
    this.home = [x, z, yaw, sit];
  }
  // move only when the player can't see the teleport
  placeLater(x, z, yaw, o) { this.pending = [x, z, yaw, o]; }
  setVisible(v) { this.visible = v; this.char.root.visible = v; }
  goTo(x, z, speed, cb) { this.target = [x, z]; this.moveSpeed = speed || this.walkSpeed; this.onArrive = cb || null; this.sit = false; }
  update(dt) {
    if (!this.visible) return;
    if (this.pending) {
      const [x, z] = this.pending; const far = d => d > 35;
      const dHere = this.pos.distanceTo(camera.position), dThere = Math.hypot(x - camera.position.x, z - camera.position.z);
      const onScreen = p => { const v = p.clone().project(camera); return v.z < 1 && Math.abs(v.x) < 1.1 && Math.abs(v.y) < 1.1; };
      if ((far(dHere) || !onScreen(this.pos.clone().setY(this.pos.y + 1))) && (far(dThere) || !onScreen(new THREE.Vector3(x, groundAt(x, z) + 1, z)))) { const [px, pz, py, o] = this.pending; this.pending = null; this.place(px, pz, py, o || {}); }
    }
    const dCam = this.pos.distanceTo(camera.position);
    this.char.root.visible = dCam < 150 && !this.hidden;
    const ch = this.char; const dp = Math.hypot(Player.pos.x - this.pos.x, Player.pos.z - this.pos.z);
    let speed = 0;
    if (this.target) {
      const dx = this.target[0] - this.pos.x, dz = this.target[1] - this.pos.z, d = Math.hypot(dx, dz);
      if (d < .4) { this.target = null; const cb = this.onArrive; this.onArrive = null; if (cb) cb(this); }
      else {
        speed = this.moveSpeed || this.walkSpeed;
        this.yaw = dampAngle(this.yaw, Math.atan2(dx, dz), 6, dt);
        const ox = this.pos.x, oz = this.pos.z;
        this.pos.x += Math.sin(this.yaw) * speed * dt; this.pos.z += Math.cos(this.yaw) * speed * dt;
        if (!this.noCollide) { const g = resolveCircle(this.pos, .3, this.pos.y, 1.7, .55); this.pos.y = damp(this.pos.y, g, 12, dt); }
        else this.pos.y = damp(this.pos.y, groundAt(this.pos.x, this.pos.z), 12, dt);
        const moved = Math.hypot(this.pos.x - ox, this.pos.z - oz);
        if (moved < speed * dt * .3) { this.stuckT += dt; if (this.stuckT > 1.5) { this.target = null; this.stuckT = 0; this.wait = .5; } } else this.stuckT = 0;
      }
    } else if (this.wander && !this.sit) {
      this.wait -= dt;
      if (this.wait <= 0 && dp > 4) { const opts = WANDER.filter(w => Math.hypot(w[0] - this.pos.x, w[1] - this.pos.z) < 55 && Math.hypot(w[0] - this.pos.x, w[1] - this.pos.z) > 4); const w = opts.length ? pick(opts) : pick(WANDER); this.goTo(w[0] + rr(-2, 2), w[1] + rr(-2, 2)); this.wait = rr(3, 9); }
    }
    if (!this.target && this.lookAtPlayer && dp < 4.5 && !this.sit && !Player.car) this.yaw = dampAngle(this.yaw, Math.atan2(Player.pos.x - this.pos.x, Player.pos.z - this.pos.z), 4, dt);
    if (this.forceYaw != null) this.yaw = dampAngle(this.yaw, this.forceYaw, 6, dt);
    ch.speed = speed;
    if (this.dancing) ch.mode = 'dance';
    else if (this.ghost) ch.mode = 'ghost';
    else ch.mode = this.sit ? 'sit' : (this.talking ? 'talk' : 'walk');
    ch.root.position.set(this.pos.x, this.sit && this.seatY != null ? this.seatY : this.pos.y, this.pos.z); ch.root.rotation.y = this.yaw;
    if (dCam < 80) ch.update(dt); else ch.t += dt;
  }
}
function spawnNPCs() {
  const story = ['anya', 'elise', 'steven'];
  for (const k of story) new NPC(k, CAST[k], { story: true });
  new NPC('father', CAST.father, { story: true });
  new NPC('coach', CAST.coach, { story: true });
  new NPC('ruth', CAST.ruth, { story: true });
  new NPC('dale', CAST.dale, { story: true });
  for (const k of ['marisol', 'bridget', 'tasha', 'nora']) new NPC(k, CAST[k], { wander: false });
  const names = [['kevin', 'Kevin', false], ['lauren', 'Lauren', true], ['marcus', 'Marcus', false], ['priya', 'Priya', true], ['danny', 'Danny', false], ['jen', 'Jen', true], ['tom', 'Tom', false], ['sofia', 'Sofia', true]];
  const r = mulberry32(99);
  names.forEach(([id, nm, fem], i) => {
    const sp = { fem, skin: SKINS[Math.floor(r() * SKINS.length)], hairCol: HAIRS[Math.floor(r() * 6)], hair: fem ? ['long', 'bob', 'ponytail', 'bun', 'curly'][i % 5] : ['short', 'buzz', 'curly', 'short'][i % 4], outfit: fem ? (i % 3 === 0 ? 'hoodie' : 'uniformF') : (i % 3 === 1 ? 'hoodie' : 'uniformM'), accent: i % 3 === 0 || i % 3 === 1 ? pick(['#5a5c60', '#2f4a36', '#5a4a6e', '#7e1d20']) : null, height: .96 + r() * .08, eye: '#3a2a1e' };
    const n = new NPC(id, { name: nm, role: 'Student', spec: sp }, { wander: true });
    const w = WANDER[(i * 3) % WANDER.length]; n.place(w[0], w[1], r() * TAU);
  });
  const g = new NPC('pruitt', CAST.pruitt, { story: true }); g.walkSpeed = 1.5;
  const ghost = new NPC('ghost', CAST.ghost, { talkable: false, lookAtPlayer: false }); ghost.ghost = true; ghost.noCollide = true; ghost.setVisible(false); ghost.char.setOpacity(.92);
  // menu actors
  const mg = new NPC('menuGirl', { name: '', spec: CAST.anya.spec }, { talkable: false, lookAtPlayer: false }); mg.setVisible(false);
  defaultCast();
}
function defaultCast() {
  const N = NPCS;
  N.anya.place(36, -1.5, -Math.PI / 2); N.elise.place(-44.2, 1.2, Math.PI / 2, { sit: false });
  N.steven.place(-38, 66, -.6); N.father.place(-70, 0, Math.PI / 2); N.coach.place(70, 4, -Math.PI / 2);
  N.ruth.place(3, -24.5, 0); N.dale.place(-148, 165.4, Math.PI);
  const s0 = World.seats[0], s1 = World.seats[1];
  N.marisol.place(s0.x, s0.z, s0.yaw, { sit: true, y: 0 }); N.bridget.place(s0.x + 1.6, s0.z + .9, s0.yaw + 2.4);
  N.tasha.place(66, 57.85, 0, { sit: true, y: 1.35 }); N.nora.place(s1.x, s1.z, s1.yaw, { sit: true, y: 0 });
  N.pruitt.place(-30, 62, 0);
  for (const n of NPCList) { n.setVisible(!['ghost', 'menuGirl'].includes(n.id)); n.dancing = false; n.talking = false; n.forceYaw = null; n.hidden = false; n.pending = null; if (n.def.role === 'Student') n.wander = true; }
}

/* ============================== security guard ============================== */
const Guard = { sus: 0, chase: false, lastSeen: null, route: [[-50, -20], [50, -20], [52, -60], [-52, -60], [-50, -20], [-20, 30], [20, 40], [50, 10], [20, 0], [-40, 10]], ri: 0, caughtT: 0, active: false, alerted: false };
function campusZone(x, z) { return x > -100 && x < 120 && z > -70 && z < 110; }
function guardUpdate(dt) {
  const g = NPCS.pruitt; if (!g) return;
  const night = TOD.hour >= 22 || TOD.hour < 5;
  const sp = World.spotGuard;
  if (!night || Game.state !== 'play' || Game.mission?.noGuard) {
    if (Guard.active) { Guard.active = false; Guard.sus = 0; Guard.chase = false; g.wander = false; g.place(-30, 62, 0); }
    sp.intensity = 0; return;
  }
  if (!Guard.active) { Guard.active = true; g.place(-20, -20, Math.PI / 2); g.wander = false; Guard.ri = 0; }
  // flashlight
  const f = Math.sin(g.yaw), c = Math.cos(g.yaw);
  sp.intensity = 70; sp.position.set(g.pos.x + f * .3, g.pos.y + 1.3, g.pos.z + c * .3); sp.target.position.set(g.pos.x + f * 10, g.pos.y, g.pos.z + c * 10); sp.target.updateMatrixWorld();
  const dx = Player.pos.x - g.pos.x, dz = Player.pos.z - g.pos.z, d = Math.hypot(dx, dz);
  const inZone = campusZone(Player.pos.x, Player.pos.z) && !Player.car;
  let seen = false;
  if (inZone && d < 24 && !Game.talking) {
    const ang = Math.abs(wrapAngle(Math.atan2(dx, dz) - g.yaw));
    if (ang < .7 || d < 3) { const o = new THREE.Vector3(g.pos.x, g.pos.y + 1.6, g.pos.z); const dir = new THREE.Vector3(dx, Player.pos.y + 1.2 - o.y, dz); const L = dir.length(); dir.normalize(); seen = rayBoxes(o, dir, L) >= .98; }
  }
  if (seen) { Guard.sus = Math.min(3, Guard.sus + dt * (d < 10 ? 1.1 : .55)); Guard.lastSeen = [Player.pos.x, Player.pos.z]; if (!Guard.alerted && Guard.sus > .3) { Guard.alerted = true; toast('Mr. Pruitt: "Hey! Who\'s out there?"'); AudioFX.alarm(); } }
  else Guard.sus = Math.max(0, Guard.sus - dt * (Guard.chase ? .13 : .3));
  if (Guard.sus < .05) Guard.alerted = false;
  Guard.chase = Guard.sus >= 1;
  if (Guard.chase && Guard.lastSeen) {
    g.goTo(Guard.lastSeen[0], Guard.lastSeen[1], seen ? 5.0 : 3.6);
    if (d < 1.15 && seen) caught();
  } else if (!g.target) {
    Guard.ri = (Guard.ri + 1) % Guard.route.length; const w = Guard.route[Guard.ri]; g.goTo(w[0], w[1], 1.5);
  }
}
async function caught() {
  if (Game.busy) return; Game.busy = true; Player.frozen = true;
  AudioFX.alarm(); $('#caught').hidden = false; await wait(2200);
  await fadeOut(600); $('#caught').hidden = true;
  Guard.sus = 0; Guard.chase = false; Guard.lastSeen = null;
  placePlayer(-45, 92, Math.PI); NPCS.pruitt.place(-20, -20, Math.PI / 2);
  toast('Detention. Your objective is still waiting.');
  Player.frozen = false; Game.busy = false; await fadeIn(800);
}

/* ============================== visions ============================== */
const Vision = { hyst: 0, target: 0, nextAmbient: 10, flickerT: 0, beatT: 0 };
function visionUpdate(dt, t) {
  const inWoods = Player.pos.z < -72 && Game.state === 'play';
  const night = TOD.night;
  // ambient dread in the woods at night
  let base = 0;
  if (inWoods) base = .06 + night * .12;
  if (Game.mission && Game.mission.dread) base = Math.max(base, Game.mission.dread);
  Vision.hyst = damp(Vision.hyst, Math.max(base, Vision.target), 1.6, dt);
  gradePass.uniforms.uHyst.value = Vision.hyst;
  $('#hyst').style.opacity = clamp((Vision.hyst - .15) * 1.4, 0, 1) * (.75 + Math.sin(t * 5.2) * .25);
  TOD.fogBoost = inWoods ? .006 + night * .008 : 0;
  if (Vision.hyst > .3) { Vision.beatT -= dt; if (Vision.beatT <= 0) { AudioFX.heartbeat(.25 + Vision.hyst * .4); Vision.beatT = lerp(1.1, .55, Vision.hyst); } }
  if (Game.state === 'play' && inWoods && night > .6 && !Game.busy) {
    Vision.nextAmbient -= dt;
    if (Vision.nextAmbient <= 0) { Vision.nextAmbient = rr(25, 55); ambientFlicker(); }
  }
}
async function ambientFlicker() {
  const gh = NPCS.ghost; if (!gh || gh.visible) return;
  const a = Cam.yaw + rr(-.5, .5), d = rr(18, 30);
  const x = Player.pos.x + Math.sin(a) * d, z = Player.pos.z + Math.cos(a) * d;
  gh.place(x, z, Math.atan2(Player.pos.x - x, Player.pos.z - z)); gh.setVisible(true);
  AudioFX.whisper(2.2, .1);
  for (let i = 0; i < 5; i++) { gh.hidden = Math.random() < .35; await wait(rr(60, 180)); }
  gh.hidden = false; await wait(400); gh.setVisible(false);
}
const wait = ms => new Promise(r => setTimeout(r, ms));
