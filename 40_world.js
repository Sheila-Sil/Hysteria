
/* ============================== world layout ============================== */
const U = { time: { value: 0 } };
const LAKE = { x: 84, z: -238, r: 46, y: -1.2 };
const ROADS = [
  { pts: [[-380, 140], [-200, 140], [-45, 140], [120, 140], [300, 140]], w: 9 },
  { pts: [[-45, 84], [-45, 112], [-45, 140]], w: 7 }
];
const PATHS = [
  { pts: [[0, -27], [0, 50]], w: 4.5 },
  { pts: [[-46, 0], [43, 0]], w: 4 },
  { pts: [[-50, -24], [50, -24]], w: 3.5 },
  { pts: [[50, -24], [52, -28], [52, -60], [0, -62]], w: 3 },
  { pts: [[-50, -24], [-52, -28], [-52, -60], [0, -62]], w: 3 },
  { pts: [[0, 34], [-14, 46], [-30, 56]], w: 3.5 },
  { pts: [[4, 34], [30, 44], [50, 52]], w: 3.5 },
  { pts: [[62, 13.5], [62, 52]], w: 3 },
  { pts: [[-46, 0], [-46, 20], [-45, 55]], w: 3 }
];
const TRAILS = [
  { pts: [[0, -62], [-4, -84], [-12, -104], [-24, -128], [-36, -150], [-40, -160]], w: 2.6 },
  { pts: [[-12, -104], [4, -132], [22, -160], [32, -186], [36, -204]], w: 2.4 }
];
const DISCS = [{ x: 0, z: 0, r: 9.5 }, { x: 0, z: 26, r: 4.6 }];
const RECTS_PAVED = [{ minX: -67, maxX: -23, minZ: 55, maxZ: 85, s: 'asphalt' }, { minX: -125, maxX: -95, minZ: 150, maxZ: 178, s: 'asphalt' }, { minX: -165, maxX: -135, minZ: 146, maxZ: 156, s: 'asphalt' }];
const FLOORS = []; // interior floors {minX,maxX,minZ,maxZ,s}
const FOOTPRINTS = []; // building footprints for masks
const PLACES = {
  gym: { x: 62, z: 0, r: 5, label: 'Gymnasium' }, gym_door: { x: 41, z: 0 }, chapel: { x: -62, z: 0, r: 4, label: 'Chapel of St. Agatha' }, confession: { x: -58.5, z: -5.2, r: 2 },
  fountain: { x: 0, z: 0, r: 6, label: 'The Quad' }, hall_steps: { x: 0, z: -24, r: 4, label: 'Main Hall' }, parking: { x: -45, z: 70, r: 7, label: 'Student Lot' },
  field: { x: 70, z: 85, r: 8, label: 'Lions Field' }, bleachers: { x: 70, z: 58, r: 5, label: 'Bleachers' }, diner: { x: -150, z: 162, r: 4, label: "Dale's Diner" }, diner_lot: { x: -150, z: 151, r: 6 },
  gas: { x: -110, z: 164, r: 6, label: 'Gas station' }, clearing: { x: -40, z: -165, r: 7, label: 'The Clearing' }, boathouse: { x: 42, z: -206, r: 4, label: 'Boathouse' },
  dock: { x: 58, z: -206, r: 3 }, trailhead: { x: 0, z: -64, r: 4, label: 'Trailhead' }, watertower: { x: 150, z: -40, r: 8, label: 'Water tower' }, town: { x: -250, z: 140, r: 10, label: 'Fairhaven' },
  statue: { x: 0, z: 26, r: 4 }
};

function rectMask(x, z, x0, x1, z0, z1, f) { const dx = Math.max(x0 - x, 0, x - x1), dz = Math.max(z0 - z, 0, z - z1); return 1 - smooth(0, f, Math.hypot(dx, dz)); }
function circMask(x, z, cx, cz, r, f) { return 1 - smooth(r, r + f, Math.hypot(x - cx, z - cz)); }
function roadDist(x, z) { let d = 1e9; for (const r of ROADS) d = Math.min(d, polyDist(x, z, r.pts) - r.w / 2); return d; }
function heightAt(x, z) {
  const r = Math.hypot(x, z - 10);
  const hills = (fbm(x * .0045 + 3.1, z * .0045 - 1.7, 4) * 34 + 10) * smooth(170, 340, r);
  const bumps = fbm(x * .028, z * .028, 3) * 2.4;
  let h = hills + bumps;
  let flat = Math.max(
    rectMask(x, z, -115, 135, -72, 122, 26),
    rectMask(x, z, -340, -90, 112, 186, 30),
    circMask(x, z, -40, -165, 16, 14),
    circMask(x, z, 42, -206, 8, 10),
    circMask(x, z, 150, -40, 12, 10),
    1 - smooth(4, 18, roadDist(x, z))
  );
  h *= 1 - flat;
  const dl = Math.hypot(x - LAKE.x, z - LAKE.z);
  if (dl < 56) h = lerp(-5, h, smooth(28, 54, dl));
  return h;
}
function onPolyList(x, z, list, pad = 0) { for (const p of list) if (polyDist(x, z, p.pts) < p.w / 2 + pad) return true; return false; }
function inRect(x, z, r, pad = 0) { return x >= r.minX - pad && x <= r.maxX + pad && z >= r.minZ - pad && z <= r.maxZ + pad; }
function surfaceAt(x, z) {
  for (const f of FLOORS) if (inRect(x, z, f)) return f.s;
  if (roadDist(x, z) < 0) return 'asphalt';
  for (const r of RECTS_PAVED) if (inRect(x, z, r)) return r.s;
  for (const d of DISCS) if (Math.hypot(x - d.x, z - d.z) < d.r) return 'concrete';
  if (onPolyList(x, z, PATHS)) return 'concrete';
  if (onPolyList(x, z, TRAILS)) return 'dirt';
  if (treeDensity(x, z) > .35) return 'leaves';
  return 'grass';
}
function treeDensity(x, z) {
  let d = smooth(-68, -96, z) * .95;
  const r = Math.hypot(x, z - 10); d = Math.max(d, smooth(175, 240, r) * .8);
  d = Math.max(d, rectMask(x, z, 170, 400, -60, 60, 40) * .5);
  return d;
}
function treeBlocked(x, z) {
  if (roadDist(x, z) < 6) return true;
  if (rectMask(x, z, -118, 138, -70, 124, 0) > .5) return true;
  if (rectMask(x, z, -345, -88, 108, 190, 0) > .5) return true;
  if (Math.hypot(x - LAKE.x, z - LAKE.z) < LAKE.r + 6) return true;
  if (Math.hypot(x + 40, z + 165) < 19) return true;
  if (Math.hypot(x - 42, z + 206) < 13) return true;
  if (Math.hypot(x - 150, z + 40) < 12) return true;
  if (onPolyList(x, z, TRAILS, 2.2)) return true;
  if (Math.abs(x) > 490 || Math.abs(z) > 490) return true;
  return false;
}

/* ============================== geometry helpers ============================== */
const _m4 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _v3 = new THREE.Vector3(), _s3 = new THREE.Vector3();
function M(x, y, z, ry = 0, sx = 1, sy = 1, sz = 1, rx = 0, rz = 0) { _e.set(rx, ry, rz); _q.setFromEuler(_e); return new THREE.Matrix4().compose(_v3.set(x, y, z), _q, _s3.set(sx, sy, sz)); }
function boxGeo(w, h, d, uvs = 1) {
  const g = new THREE.BoxGeometry(w, h, d); const uv = g.attributes.uv;
  const dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
  for (let f = 0; f < 6; f++) for (let i = 0; i < 4; i++) { const k = f * 4 + i; uv.setXY(k, uv.getX(k) * dims[f][0] / uvs, uv.getY(k) * dims[f][1] / uvs); }
  return g;
}
function scaleUV(g, su, sv = su) { const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * su, uv.getY(i) * sv); return g; }
function gableGeo(w, d, h, overhang = .6) { // ridge along X, width w (x), depth d (z)
  const s = new THREE.Shape(); const hd = d / 2 + overhang;
  s.moveTo(-hd, 0); s.lineTo(hd, 0); s.lineTo(0, h); s.lineTo(-hd, 0);
  const g = new THREE.ExtrudeGeometry(s, { depth: w + overhang * 2, bevelEnabled: false });
  g.translate(0, 0, -(w + overhang * 2) / 2); g.rotateY(Math.PI / 2);
  scaleUV(g, .35);
  return g;
}
class Batch {
  constructor() { this.map = new Map(); }
  add(geo, mat, m4) {
    let g = geo.index ? geo.toNonIndexed() : geo.clone();
    if (m4) g.applyMatrix4(m4);
    for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    if (!g.attributes.normal) g.computeVertexNormals();
    g.clearGroups();
    let e = this.map.get(mat); if (!e) { e = []; this.map.set(mat, e); } e.push(g);
    return this;
  }
  box(w, h, d, mat, x, y, z, ry = 0, uvs = 1.6) { return this.add(boxGeo(w, h, d, uvs), mat, M(x, y, z, ry)); }
  flush(parent, cast = true, receive = true) {
    const out = [];
    for (const [mat, list] of this.map) { const merged = mergeGeometries(list, false); merged.computeBoundingSphere(); const mesh = new THREE.Mesh(merged, mat); mesh.castShadow = cast; mesh.receiveShadow = receive; parent.add(mesh); out.push(mesh); list.forEach(g => g.dispose()); }
    this.map.clear(); return out;
  }
}

/* ============================== collision ============================== */
const CELL = 16;
const COL = { grid: new Map(), stamp: 0, list: [] };
const ckey = (i, j) => (i + 512) * 2048 + (j + 512);
function addCollider(minX, maxX, minZ, maxZ, minY = 0, maxY = 20, extra = null) {
  const c = { minX, maxX, minZ, maxZ, minY, maxY, s: 0 }; if (extra) Object.assign(c, extra);
  COL.list.push(c);
  for (let i = Math.floor(minX / CELL); i <= Math.floor(maxX / CELL); i++) for (let j = Math.floor(minZ / CELL); j <= Math.floor(maxZ / CELL); j++) { const k = ckey(i, j); let a = COL.grid.get(k); if (!a) { a = []; COL.grid.set(k, a); } a.push(c); }
  return c;
}
const addBoxC = (x, z, w, d, h = 20, y0 = 0, extra) => addCollider(x - w / 2, x + w / 2, z - d / 2, z + d / 2, y0, y0 + h, extra);
const addCircleC = (x, z, r, h = 12) => addCollider(x - r, x + r, z - r, z + r, -2, h, { r, cx: x, cz: z });
const _qres = [];
function queryCol(x, z, r) {
  COL.stamp++; _qres.length = 0;
  for (let i = Math.floor((x - r) / CELL); i <= Math.floor((x + r) / CELL); i++) for (let j = Math.floor((z - r) / CELL); j <= Math.floor((z + r) / CELL); j++) {
    const a = COL.grid.get(ckey(i, j)); if (!a) continue;
    for (const c of a) if (c.s !== COL.stamp) { c.s = COL.stamp; _qres.push(c); }
  }
  return _qres;
}
// Push a circle out of colliders; returns ground height under its centre.
function resolveCircle(p, r, feetY, height, stepH = .5) {
  let ground = heightAt(p.x, p.z);
  const list = queryCol(p.x, p.z, r + 1);
  for (let it = 0; it < 2; it++) for (const c of list) {
    if (c.maxY <= feetY + stepH) {
      if (it === 0 && c.maxY > ground && !c.r && p.x >= c.minX - r * .3 && p.x <= c.maxX + r * .3 && p.z >= c.minZ - r * .3 && p.z <= c.maxZ + r * .3) ground = c.maxY;
      continue;
    }
    if (c.minY > feetY + height) continue;
    if (c.r) {
      const dx = p.x - c.cx, dz = p.z - c.cz, d = Math.hypot(dx, dz), m = c.r + r;
      if (d < m && d > 1e-5) { p.x = c.cx + dx / d * m; p.z = c.cz + dz / d * m; }
      continue;
    }
    const cx = clamp(p.x, c.minX, c.maxX), cz = clamp(p.z, c.minZ, c.maxZ);
    const dx = p.x - cx, dz = p.z - cz, d2 = dx * dx + dz * dz;
    if (d2 < r * r) {
      if (d2 > 1e-8) { const d = Math.sqrt(d2); p.x = cx + dx / d * r; p.z = cz + dz / d * r; }
      else { // centre inside: push along the shallowest axis
        const l = p.x - c.minX, rr_ = c.maxX - p.x, t = p.z - c.minZ, b = c.maxZ - p.z, m = Math.min(l, rr_, t, b);
        if (m === l) p.x = c.minX - r; else if (m === rr_) p.x = c.maxX + r; else if (m === t) p.z = c.minZ - r; else p.z = c.maxZ + r;
      }
    }
  }
  return ground;
}
// Ray vs boxes for camera occlusion. Returns hit fraction 0..1.
function rayBoxes(o, d, len) {
  let best = 1; const ex = o.x + d.x * len, ez = o.z + d.z * len;
  const list = queryCol((o.x + ex) / 2, (o.z + ez) / 2, len / 2 + 1);
  for (const c of list) {
    if (c.r || c.noCam) continue;
    if (c.maxY - c.minY < 1.2 && c.maxY < o.y - .5) continue;
    let tmin = 0, tmax = len;
    for (const [oa, da, mn, mx] of [[o.x, d.x, c.minX - .15, c.maxX + .15], [o.y, d.y, c.minY - .15, c.maxY + .15], [o.z, d.z, c.minZ - .15, c.maxZ + .15]]) {
      if (Math.abs(da) < 1e-6) { if (oa < mn || oa > mx) { tmin = 1e9; break; } }
      else { let t1 = (mn - oa) / da, t2 = (mx - oa) / da; if (t1 > t2) [t1, t2] = [t2, t1]; tmin = Math.max(tmin, t1); tmax = Math.min(tmax, t2); if (tmin > tmax) break; }
    }
    if (tmin <= tmax && tmin < len && tmin > 0) best = Math.min(best, tmin / len);
  }
  return best;
}

/* ============================== world build ============================== */
const World = { group: new THREE.Group(), lights: [], lightSources: [], nightFns: [], updaters: [], interactables: [], vehicles: [], ribbons: [], clockHands: [], items: [], grass: null, grassMax: 48000 };
scene.add(World.group);
const MAT = {};
function buildMaterials() {
  const S = (o) => new THREE.MeshStandardMaterial(o);
  MAT.brick = S({ map: TEX.brick, bumpMap: TEX.brickBump, bumpScale: 2, roughness: .9 });
  MAT.stone = S({ map: TEX.stone, roughness: .85, color: 0xe2dccf });
  MAT.stoneDark = S({ map: TEX.stone, roughness: .9, color: 0x7d776c });
  MAT.trim = S({ color: 0xd9d1bf, roughness: .7, map: TEX.stone });
  MAT.slate = S({ map: TEX.slate, roughness: .75, metalness: .05, side: THREE.DoubleSide });
  MAT.shingle = S({ map: TEX.shingle, roughness: .9, side: THREE.DoubleSide });
  MAT.wood = S({ map: TEX.wood, roughness: .55 });
  MAT.woodDark = S({ map: TEX.woodDark, roughness: .7 });
  MAT.woodWeather = S({ map: TEX.woodDark, roughness: .95, color: 0x9a948a });
  MAT.court = S({ map: TEX.court, roughness: .32, metalness: 0 });
  MAT.field = S({ map: TEX.field, roughness: .95 });
  MAT.asphalt = S({ map: TEX.asphalt, roughness: .92 });
  MAT.road = S({ map: TEX.road, roughness: .9, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  MAT.concrete = S({ map: TEX.concrete, roughness: .88, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
  MAT.concreteSolid = S({ map: TEX.concrete, roughness: .88 });
  MAT.dirtTrail = S({ map: TEX.dirt, roughness: 1, transparent: true, alphaMap: canvasTex(64, 8, (g, w, h) => { const gr = g.createLinearGradient(0, 0, w, 0); gr.addColorStop(0, '#000'); gr.addColorStop(.3, '#fff'); gr.addColorStop(.7, '#fff'); gr.addColorStop(1, '#000'); g.fillStyle = gr; g.fillRect(0, 0, w, h); }, { srgb: false }), depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  MAT.siding = S({ map: TEX.siding, roughness: .8 });
  MAT.metal = S({ color: 0x24262a, roughness: .45, metalness: .8 });
  MAT.metalLight = S({ color: 0x9aa0a6, roughness: .35, metalness: .9 });
  MAT.white = S({ color: 0xe8e4da, roughness: .6 });
  MAT.red = S({ color: 0x7e1d20, roughness: .6 });
  MAT.gold = S({ color: 0xc8a050, roughness: .3, metalness: 1 });
  MAT.black = S({ color: 0x111214, roughness: .6 });
  MAT.checker = S({ map: TEX.checker, roughness: .25 });
  MAT.ceiling = S({ color: 0x2a2826, roughness: .95, side: THREE.DoubleSide });
  MAT.glassDark = S({ color: 0x0c1218, roughness: .05, metalness: .6 });
  MAT.water = S({ color: 0x14242a, roughness: .06, metalness: .1, normalMap: TEX.water, normalScale: new THREE.Vector2(.35, .35), transparent: true, opacity: .92, envMapIntensity: 1.4 });
  MAT.rock = S({ color: 0x77736b, roughness: .95, flatShading: true });
  MAT.ash = S({ color: 0x1b1918, roughness: 1 });
  const E = (map, col = 0xffffff) => S({ map, emissiveMap: map, emissive: col, emissiveIntensity: 0, roughness: .2, metalness: .1, transparent: map === TEX.archLit || map === TEX.archDark, alphaTest: .5 });
  MAT.winLit = E(TEX.winLit, 0xffe2b0); MAT.winLit2 = E(TEX.winLit, 0xd8e6ff); MAT.winDark = E(TEX.winDark, 0x000000);
  MAT.archLit = E(TEX.archLit, 0xffd9a0); MAT.archDark = E(TEX.archDark, 0x000000);
  MAT.stainedIn = S({ map: TEX.stained, emissiveMap: TEX.stained, emissive: 0xffffff, emissiveIntensity: 1.3, transparent: true, alphaTest: .4, roughness: .3 });
  MAT.stainedOut = S({ map: TEX.stained, emissiveMap: TEX.stained, emissive: 0xffffff, emissiveIntensity: .2, transparent: true, alphaTest: .4, roughness: .3 });
  MAT.roseIn = S({ map: TEX.rose, emissiveMap: TEX.rose, emissive: 0xffffff, emissiveIntensity: 1.3, transparent: true, alphaTest: .4 });
  MAT.roseOut = S({ map: TEX.rose, emissiveMap: TEX.rose, emissive: 0xffffff, emissiveIntensity: .2, transparent: true, alphaTest: .4 });
  MAT.lampGlass = S({ color: 0xfff1d0, emissive: 0xffc070, emissiveIntensity: .3, roughness: .2 });
  MAT.lightPanel = S({ color: 0xffffff, emissive: 0xf4f6ff, emissiveIntensity: 1.3, roughness: .3 });
  MAT.flood = S({ color: 0xffffff, emissive: 0xf0f4ff, emissiveIntensity: 0, roughness: .3 });
  MAT.clock = S({ map: TEX.clock, emissiveMap: TEX.clock, emissive: 0xffe6b0, emissiveIntensity: 0, roughness: .5 });
  MAT.flame = new THREE.MeshBasicMaterial({ color: 0xffb255, transparent: true, opacity: .95, blending: THREE.AdditiveBlending, depthWrite: false });
  MAT.ember = S({ color: 0x220a04, emissive: 0xff4a12, emissiveIntensity: 2.5, roughness: 1 });
  MAT.candle = S({ color: 0xf0e8d6, roughness: .6 });
  MAT.ribbon = S({ color: 0xb01a22, emissive: 0x6a0408, emissiveIntensity: .6, roughness: .6, side: THREE.DoubleSide });
  MAT.redLight = new THREE.MeshBasicMaterial({ color: 0xff2020 });
  MAT.fabric = S({ color: 0x6e1418, roughness: 1, side: THREE.DoubleSide });
}

function addLightSource(x, y, z, color, intensity, distance, nightOnly = true, flicker = 0) { const s = { pos: new THREE.Vector3(x, y, z), color: new THREE.Color(color), intensity, distance, nightOnly, flicker }; World.lightSources.push(s); return s; }
function addInteract(o) { World.interactables.push(Object.assign({ r: 2.2, key: 'E', enabled: () => true }, o)); return o; }

/* ---------- terrain ---------- */
function buildTerrain() {
  const S = 1000, N = 250;
  const g = new THREE.PlaneGeometry(S, S, N, N); g.rotateX(-Math.PI / 2);
  const pos = g.attributes.position, col = new Float32Array(pos.count * 3);
  const cGrass = new THREE.Color(0x56602e), cGrass2 = new THREE.Color(0x77733c), cDry = new THREE.Color(0x8a7a48), cForest = new THREE.Color(0x3d3020), cMud = new THREE.Color(0x4a3f30), tmp = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i), y = heightAt(x, z); pos.setY(i, y);
    const n = fbm(x * .02, z * .02, 3) * .5 + .5, n2 = fbm(x * .07 + 9, z * .07, 2) * .5 + .5;
    tmp.copy(cGrass).lerp(cGrass2, n).lerp(cDry, smooth(.6, .9, n2) * .5);
    tmp.lerp(cForest, clamp(treeDensity(x, z) * 1.1, 0, .85));
    const dl = Math.hypot(x - LAKE.x, z - LAKE.z); tmp.lerp(cMud, 1 - smooth(LAKE.r - 6, LAKE.r + 8, dl));
    col[i * 3] = tmp.r; col[i * 3 + 1] = tmp.g; col[i * 3 + 2] = tmp.b;
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.computeVertexNormals();
  scaleUV(g, 160);
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, map: TEX.ground, roughness: 1 });
  const mesh = new THREE.Mesh(g, m); World.terrainMesh = mesh; World.terrainMat = m; mesh.receiveShadow = true; World.group.add(mesh);
  // lake
  const water = new THREE.Mesh(new THREE.CircleGeometry(LAKE.r + 14, 64), MAT.water); water.rotation.x = -Math.PI / 2; water.position.set(LAKE.x, LAKE.y, LAKE.z); water.receiveShadow = true; World.group.add(water);
  scaleUV(water.geometry, 6);
  // heightmap texture for grass
  const HS = 256, hd = new Float32Array(HS * HS);
  for (let j = 0; j < HS; j++) for (let i = 0; i < HS; i++) hd[j * HS + i] = heightAt(-500 + i / (HS - 1) * 1000, -500 + j / (HS - 1) * 1000);
  World.heightTex = new THREE.DataTexture(hd, HS, HS, THREE.RedFormat, THREE.FloatType); World.heightTex.needsUpdate = true;
}
function ribbon(pts, w, yOff, mat, vScale = 8, step = 3) {
  const P = [];
  for (let i = 0; i < pts.length - 1; i++) { const [ax, az] = pts[i], [bx, bz] = pts[i + 1]; const n = Math.max(1, Math.ceil(Math.hypot(bx - ax, bz - az) / step)); for (let k = 0; k < n; k++) P.push([lerp(ax, bx, k / n), lerp(az, bz, k / n)]); }
  P.push(pts[pts.length - 1]);
  const pos = [], uv = [], nor = [], idx = []; let acc = 0;
  for (let i = 0; i < P.length; i++) {
    const a = P[Math.max(0, i - 1)], b = P[Math.min(P.length - 1, i + 1)]; let dx = b[0] - a[0], dz = b[1] - a[1]; const l = Math.hypot(dx, dz) || 1; dx /= l; dz /= l;
    const nx = -dz, nz = dx, [x, z] = P[i];
    const lx = x + nx * w / 2, lz = z + nz * w / 2, rx = x - nx * w / 2, rz = z - nz * w / 2;
    pos.push(lx, heightAt(lx, lz) + yOff, lz, rx, heightAt(rx, rz) + yOff, rz); nor.push(0, 1, 0, 0, 1, 0);
    uv.push(0, acc / vScale, 1, acc / vScale);
    if (i < P.length - 1) acc += Math.hypot(P[i + 1][0] - x, P[i + 1][1] - z);
    if (i > 0) { const k = i * 2; idx.push(k - 2, k, k - 1, k - 1, k, k + 1); }
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx);
  const m = new THREE.Mesh(g, mat); m.receiveShadow = true; World.group.add(m); return m;
}
function buildGround() {
  ROADS.forEach((r, i) => ribbon(r.pts, r.w, .06 + i * .01, MAT.road, 18, 4));
  PATHS.forEach((p, i) => ribbon(p.pts, p.w, .045 + i * .002, MAT.concrete, p.w, 2));
  TRAILS.forEach((p, i) => ribbon(p.pts, p.w, .07 + i * .004, MAT.dirtTrail, 4, 2));
  for (const d of DISCS) { const m = new THREE.Mesh(scaleUV(new THREE.CircleGeometry(d.r, 48), d.r / 2), MAT.concrete); m.rotation.x = -Math.PI / 2; m.position.set(d.x, .07, d.z); m.receiveShadow = true; World.group.add(m); }
  // parking lot & gas forecourt
  const lotTex = canvasTex(512, 384, (g, w, h) => { g.drawImage(TEX.asphalt.image, 0, 0, w, h); g.strokeStyle = 'rgba(235,232,220,.8)'; g.lineWidth = 4; for (let i = 0; i <= 12; i++) { const x = 20 + i * (w - 40) / 12; g.beginPath(); g.moveTo(x, 10); g.lineTo(x, 120); g.stroke(); g.beginPath(); g.moveTo(x, h - 120); g.lineTo(x, h - 10); g.stroke(); } }, { repeat: false });
  for (const r of RECTS_PAVED) {
    const w = r.maxX - r.minX, d = r.maxZ - r.minZ;
    const mat = r === RECTS_PAVED[0] ? new THREE.MeshStandardMaterial({ map: lotTex, roughness: .9, polygonOffset: true, polygonOffsetFactor: -1 }) : MAT.asphalt;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat); if (mat === MAT.asphalt) scaleUV(m.geometry, w / 8, d / 8);
    m.rotation.x = -Math.PI / 2; m.position.set((r.minX + r.maxX) / 2, .05, (r.minZ + r.maxZ) / 2); m.receiveShadow = true; World.group.add(m);
  }
}

/* ---------- reusable props ---------- */
function windowRow(B, { x0, x1, z, y, face, w = 1.5, h = 2.6, step = 4, skip = null, arch = false, litChance = .6, lit2 = .2 }) {
  // face: 'z+' 'z-' 'x+' 'x-' ; x0..x1 runs along the wall axis
  const geo = new THREE.PlaneGeometry(w, h);
  const sill = boxGeo(w + .4, .18, .35, 1);
  for (let a = x0; a <= x1 + .01; a += step) {
    if (skip && skip(a)) continue;
    const r = rand(); const mat = arch ? (r < litChance ? MAT.archLit : MAT.archDark) : (r < litChance * (1 - lit2) ? MAT.winLit : r < litChance ? MAT.winLit2 : MAT.winDark);
    let px, pz, ry;
    if (face === 'z+') { px = a; pz = z + .02; ry = 0; } else if (face === 'z-') { px = a; pz = z - .02; ry = Math.PI; } else if (face === 'x+') { px = z + .02; pz = a; ry = Math.PI / 2; } else { px = z - .02; pz = a; ry = -Math.PI / 2; }
    B.add(geo, mat, M(px, y, pz, ry));
    const off = .16; const sx = face === 'x+' ? px + off : face === 'x-' ? px - off : px, sz = face === 'z+' ? pz + off : face === 'z-' ? pz - off : pz;
    B.add(sill, MAT.trim, M(sx, y - h / 2 - .05, sz, ry));
  }
}
function lampPost(B, x, z, h = 4.2) {
  const y0 = heightAt(x, z);
  B.add(new THREE.CylinderGeometry(.07, .11, h, 8), MAT.metal, M(x, y0 + h / 2, z));
  B.add(new THREE.CylinderGeometry(.18, .22, .4, 8), MAT.metal, M(x, y0 + .2, z));
  B.add(boxGeo(.36, .5, .36), MAT.lampGlass, M(x, y0 + h + .2, z));
  B.add(new THREE.ConeGeometry(.32, .3, 4), MAT.metal, M(x, y0 + h + .6, z, Math.PI / 4));
  addLightSource(x, y0 + h + .1, z, 0xffb86a, 32, 24, true);
  addCircleC(x, z, .2, h);
}
function bench(B, x, z, ry = 0) {
  const y0 = heightAt(x, z), c = Math.cos(ry), s = Math.sin(ry);
  const P = (lx, ly, lz) => [x + lx * c + lz * s, y0 + ly, z - lx * s + lz * c];
  for (let i = 0; i < 3; i++) { const [px, py, pz] = P(0, .45, -.18 + i * .18); B.add(boxGeo(1.8, .05, .14, .5), MAT.woodDark, M(px, py, pz, ry)); }
  for (let i = 0; i < 2; i++) { const [px, py, pz] = P(0, .7 + i * .16, .3); B.add(boxGeo(1.8, .1, .04, .5), MAT.woodDark, M(px, py, pz, ry, 1, 1, 1, -.15)); }
  for (const sx of [-.8, .8]) { const [px, py, pz] = P(sx, .3, 0); B.add(boxGeo(.06, .6, .6), MAT.metal, M(px, py, pz, ry)); }
  const w = Math.abs(c) * 1.8 + Math.abs(s) * .6, d = Math.abs(s) * 1.8 + Math.abs(c) * .6; addBoxC(x, z, w, d, .5, 0, { noCam: true, seat: true });
}
function treeAt(B, x, z, kind = 'oak') { World.extraTrees.push({ x, z, kind }); }

/* ---------- buildings ---------- */
function buildHall(B) {
  const z0 = -56, z1 = -34, x0 = -45, x1 = 45, H = 15;
  B.box(92, 1.2, 24, MAT.stoneDark, 0, .6, -45);
  B.box(90, H, 22, MAT.brick, 0, H / 2, -45);
  for (const y of [5, 10]) B.box(90.5, .35, 22.5, MAT.trim, 0, y, -45, 0, 2);
  B.box(91.2, .9, 23.2, MAT.trim, 0, H + .1, -45, 0, 2);
  B.add(gableGeo(90, 22, 7, .8), MAT.slate, M(0, H + .55, -45));
  for (const x of [-30, 0, 30]) B.box(1.6, 5, 1.6, MAT.brick, x, H + 5, -49);
  for (const [x, z] of [[x0, z0], [x1, z0], [x0, z1], [x1, z1]]) B.box(1.2, H, 1.2, MAT.stone, x, H / 2, z, 0, 2);
  const skipTower = a => a > -10 && a < 10;
  for (const [i, y] of [2.6, 7.6, 12.6].entries()) {
    windowRow(B, { x0: -41, x1: 41, z: z1, y, face: 'z+', skip: skipTower, arch: i === 2, litChance: .55 });
    windowRow(B, { x0: -41, x1: 41, z: z0, y, face: 'z-', litChance: .45 });
    windowRow(B, { x0: -51, x1: -39, z: x1, y, face: 'x+', litChance: .5 });
    windowRow(B, { x0: -51, x1: -39, z: x0, y, face: 'x-', litChance: .5 });
  }
  // tower
  const tz = -36, TH = 31;
  B.box(16, TH, 16, MAT.brick, 0, TH / 2, tz);
  for (const [x, z] of [[-8, tz - 8], [8, tz - 8], [-8, tz + 8], [8, tz + 8]]) B.box(1.4, TH, 1.4, MAT.stone, x, TH / 2, z, 0, 2);
  for (const y of [5, 10, 15, 21, 28]) B.box(16.6, .45, 16.6, MAT.trim, 0, y, tz, 0, 2);
  B.box(17.4, 1.2, 17.4, MAT.trim, 0, TH + .6, tz, 0, 2);
  const spire = new THREE.ConeGeometry(11.5, 17, 4, 1); spire.rotateY(Math.PI / 4); scaleUV(spire, 3);
  B.add(spire, MAT.slate, M(0, TH + 1.2 + 8.5, tz));
  B.add(new THREE.CylinderGeometry(.08, .08, 4, 6), MAT.metal, M(0, TH + 19, tz));
  B.box(1.4, .1, .1, MAT.metal, 0, TH + 20, tz, 0, 1);
  // belfry openings
  for (let s = 0; s < 4; s++) { const a = s * Math.PI / 2; for (const o of [-3, 3]) { const px = Math.sin(a) * 8.05 + Math.cos(a) * o, pz = tz + Math.cos(a) * 8.05 - Math.sin(a) * o; B.add(new THREE.PlaneGeometry(2.2, 3.6), MAT.archDark, M(px, 18, pz, a)); } }
  // tower front windows + entrance
  B.add(new THREE.PlaneGeometry(2, 3.2), MAT.archLit, M(0, 12.6, tz + 8.03, 0));
  B.box(5.4, 5.6, .6, MAT.stone, 0, 3.4, tz + 8.2, 0, 2);
  B.box(3.4, 4.4, .3, MAT.woodDark, 0, 3.1, tz + 8.45, 0, 1);
  B.box(.12, .5, .12, MAT.gold, -.3, 2.9, tz + 8.65); B.box(.12, .5, .12, MAT.gold, .3, 2.9, tz + 8.65);
  for (let i = 0; i < 3; i++) { B.box(9 - i * 1.2, .3 * (i + 1), 1.1, MAT.stone, 0, .15 * (i + 1), tz + 9.6 + (2 - i) * 1.0 - 1, 0, 2); addBoxC(0, tz + 9.6 + (2 - i) * 1.0 - 1, 9 - i * 1.2, 1.1, .3 + i * .3, 0, { noCam: true }); }
  const nameT = textTex("ST. AGATHA'S", { w: 1024, h: 128, size: 78, color: '#2b241c', font: 'Georgia,serif', letter: 14 });
  B.add(new THREE.PlaneGeometry(7.5, .95), new THREE.MeshStandardMaterial({ map: nameT, transparent: true, roughness: .8 }), M(0, 7.4, tz + 8.52));
  // clock faces with live hands
  for (let s = 0; s < 4; s++) {
    const a = s * Math.PI / 2, px = Math.sin(a) * 8.06, pz = tz + Math.cos(a) * 8.06;
    const face = new THREE.Mesh(new THREE.CircleGeometry(2.6, 40), MAT.clock); face.position.set(px, 24.5, pz); face.rotation.y = a; World.group.add(face);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(2.65, .14, 8, 40), MAT.trim); ring.position.copy(face.position); ring.rotation.y = a; World.group.add(ring);
    for (const [len, wid, k] of [[1.5, .16, 'h'], [2.2, .1, 'm']]) {
      const pivot = new THREE.Group(); pivot.position.set(px + Math.sin(a) * (k === 'h' ? .04 : .07), 24.5, pz + Math.cos(a) * (k === 'h' ? .04 : .07)); pivot.rotation.y = a;
      const hand = new THREE.Mesh(boxGeo(wid, len, .03), MAT.black); hand.position.y = len / 2 - .2; const inner = new THREE.Group(); inner.add(hand); pivot.add(inner); World.group.add(pivot);
      World.clockHands.push({ inner, k });
    }
  }
  addCollider(x0 - 1, x1 + 1, z0 - 1, z1 + 1, 0, 24); addCollider(-8.7, 8.7, tz - 8.7, tz + 8.7, 0, 52);
  FOOTPRINTS.push({ minX: x0 - 1, maxX: x1 + 1, minZ: z0 - 1, maxZ: z1 + 1 }, { minX: -9, maxX: 9, minZ: tz - 9, maxZ: tz + 12 });
  addInteract({ id: 'hall_door', x: 0, z: tz + 10, r: 2.6, label: 'Try the doors', run: () => toast('Locked. Sister Agnes chains the main doors at four.') });
}
// Hollow building with door gaps. doors: [{side:'n'|'s'|'e'|'w', at: offset from centre along wall, w, h}]
function hollow(B, { x, z, w, d, h, t = .45, mat, doors = [], floorMat = null, floorS = 'wood', roof = 'flat', roofMat = MAT.ceiling, roofH = 4, ceiling = true }) {
  const x0 = x - w / 2, x1 = x + w / 2, z0 = z - d / 2, z1 = z + d / 2;
  const walls = { n: { a0: x0, a1: x1, fixed: z0, axis: 'x' }, s: { a0: x0, a1: x1, fixed: z1, axis: 'x' }, w: { a0: z0, a1: z1, fixed: x0, axis: 'z' }, e: { a0: z0, a1: z1, fixed: x1, axis: 'z' } };
  for (const [side, wl] of Object.entries(walls)) {
    const ds = doors.filter(dd => dd.side === side).map(dd => { const c = (wl.axis === 'x' ? x : z) + (dd.at || 0); return [c - dd.w / 2, c + dd.w / 2, dd.h]; }).sort((a, b) => a[0] - b[0]);
    let cur = wl.a0 - (wl.axis === 'x' ? t / 2 : -t / 2) * 0;
    const segs = []; for (const [a, b, dh] of ds) { segs.push([cur, a]); segs.push([a, b, dh]); cur = b; } segs.push([cur, wl.a1]);
    for (const sg of segs) {
      const [a, b, dh] = sg; const len = b - a; if (len <= .01) continue; const mid = (a + b) / 2;
      const segH = dh ? h - dh : h, y = dh ? dh + segH / 2 : h / 2;
      const ext = dh ? 0 : t; // extend solid segments to close corners
      if (wl.axis === 'x') { B.box(len + (sg === segs[0] || sg === segs[segs.length - 1] ? ext : 0), segH, t, mat, mid, y, wl.fixed); if (!dh) addCollider(a - t / 2, b + t / 2, wl.fixed - t / 2, wl.fixed + t / 2, 0, h); else addCollider(a, b, wl.fixed - t / 2, wl.fixed + t / 2, dh, h); }
      else { B.box(t, segH, len, mat, wl.fixed, y, mid); if (!dh) addCollider(wl.fixed - t / 2, wl.fixed + t / 2, a - t / 2, b + t / 2, 0, h); else addCollider(wl.fixed - t / 2, wl.fixed + t / 2, a, b, dh, h); }
    }
  }
  if (floorMat) { const fm = new THREE.Mesh(new THREE.PlaneGeometry(w - t, d - t), floorMat); fm.rotation.x = -Math.PI / 2; fm.position.set(x, .06, z); fm.receiveShadow = true; World.group.add(fm); }
  FLOORS.push({ minX: x0, maxX: x1, minZ: z0, maxZ: z1, s: floorS });
  FOOTPRINTS.push({ minX: x0 - .5, maxX: x1 + .5, minZ: z0 - .5, maxZ: z1 + .5 });
  if (ceiling) B.box(w + t, .3, d + t, MAT.ceiling, x, h + .15, z, 0, 2);
  if (roof === 'gable') B.add(gableGeo(w + t, d + t, roofH, .7), roofMat, M(x, h + .3, z));
  if (roof === 'gableZ') { const g = gableGeo(d + t, w + t, roofH, .7); g.rotateY(Math.PI / 2); B.add(g, roofMat, M(x, h + .3, z)); }
  addCollider(x0, x1, z0, z1, h, h + roofH + .5, { noCam: true });
}
function buildChapel(B) {
  const x = -62, z = 0, w = 32, d = 16, h = 9;
  hollow(B, { x, z, w, d, h, t: .6, mat: MAT.stone, doors: [{ side: 'e', at: 0, w: 3, h: 4.6 }], floorMat: new THREE.MeshStandardMaterial({ map: TEX.stone, color: 0x8a8378, roughness: .6 }), floorS: 'concrete', roof: 'gable', roofMat: MAT.slate, roofH: 7.5, ceiling: false });
  addCollider(x - w / 2, x + w / 2, z - d / 2, z + d / 2, 0, .12, { noCam: true });
  for (const sx of [-w / 2, w / 2]) for (const sz of [-d / 2, d / 2]) B.box(1.4, h + .5, 1.4, MAT.stoneDark, x + sx, (h + .5) / 2, z + sz, 0, 2);
  for (let i = 0; i < 5; i++) for (const s of [-1, 1]) B.box(1.0, 6.5, 1.1, MAT.stone, x - 12 + i * 6, 3.25, z + s * (d / 2 + .45), 0, 2);
  // gable ends (fill the triangle under the roof)
  const tri = new THREE.Shape(); tri.moveTo(-d / 2 - .3, 0); tri.lineTo(d / 2 + .3, 0); tri.lineTo(0, 7.5); tri.lineTo(-d / 2 - .3, 0);
  const tg = scaleUV(new THREE.ShapeGeometry(tri), .6); const triMat = MAT.stone.clone(); triMat.side = THREE.DoubleSide; for (const sx of [-1, 1]) { const m = new THREE.Mesh(tg, triMat); m.position.set(x + sx * (w / 2 + .01), h, z); m.rotation.y = sx > 0 ? Math.PI / 2 : -Math.PI / 2; m.castShadow = true; World.group.add(m); }
  // stained glass
  const sg = new THREE.PlaneGeometry(1.6, 4.2);
  for (let i = 0; i < 5; i++) for (const s of [-1, 1]) {
    const px = x - 13 + i * 6 + 3, ry = s > 0 ? 0 : Math.PI;
    if (px > x + 13) continue;
    B.add(sg, MAT.stainedOut, M(px, 4.4, z + s * (d / 2 + .31), ry));
    B.add(sg, MAT.stainedIn, M(px, 4.4, z + s * (d / 2 - .31), ry + Math.PI));
  }
  B.add(new THREE.CircleGeometry(2.4, 32), MAT.roseOut, M(x - w / 2 - .31, 11, z, -Math.PI / 2));
  B.add(new THREE.CircleGeometry(2.4, 32), MAT.roseIn, M(x - w / 2 + .31, 7.2, z, Math.PI / 2));
  B.add(new THREE.CircleGeometry(1.6, 32), MAT.roseOut, M(x + w / 2 + .31, 11.2, z, Math.PI / 2));
  // door + porch
  B.box(.25, 4.6, 3.6, MAT.stone, x + w / 2 + .3, 2.3, z - 2.0); B.box(.25, 4.6, .6, MAT.stone, x + w / 2 + .3, 2.3, z + 1.8);
  B.box(.6, .8, 4.4, MAT.stone, x + w / 2 + .35, 5, z, 0, 2);
  B.box(1.6, .12, 5, MAT.stone, x + w / 2 + 1.0, .06, z, 0, 2); addBoxC(x + w / 2 + 1.0, z, 1.6, 5, .12, 0, { noCam: true });
  // belfry & spire
  B.box(4.2, 6, 4.2, MAT.stone, x + 11, h + 6.5, z, 0, 2);
  for (let s = 0; s < 4; s++) { const a = s * Math.PI / 2; B.add(new THREE.PlaneGeometry(1.4, 2.6), MAT.archDark, M(x + 11 + Math.sin(a) * 2.12, h + 7.5, z + Math.cos(a) * 2.12, a)); }
  const sp = new THREE.ConeGeometry(3.1, 13, 4); sp.rotateY(Math.PI / 4); scaleUV(sp, 2); B.add(sp, MAT.slate, M(x + 11, h + 9.5 + 6.5, z));
  B.box(.18, 2.2, .18, MAT.gold, x + 11, h + 24, z); B.box(1.1, .18, .18, MAT.gold, x + 11, h + 24.4, z);
  // interior: pews, altar, cross, confessional
  for (let i = 0; i < 7; i++) for (const s of [-1, 1]) {
    const px = x - 6 + i * 2.2, pz = z + s * 3.9;
    B.box(.5, .1, 5.2, MAT.woodDark, px, .5, pz, 0, 1); B.box(.1, .9, 5.2, MAT.woodDark, px + .3, .85, pz, 0, 1);
    for (const e of [-2.55, 2.55]) B.box(.6, 1.0, .1, MAT.woodDark, px + .05, .5, pz + e, 0, 1);
    addBoxC(px + .05, pz, .7, 5.2, 1.0, 0, { noCam: true });
  }
  B.box(4, .45, d - 1.4, MAT.stone, x - w / 2 + 2.6, .225, z, 0, 2); addBoxC(x - w / 2 + 2.6, z, 4, d - 1.4, .45, 0, { noCam: true });
  B.box(1.2, 1.1, 3.4, MAT.white, x - w / 2 + 2.2, 1.0, z, 0, 1); B.box(1.3, .08, 3.6, MAT.gold, x - w / 2 + 2.2, 1.58, z); addBoxC(x - w / 2 + 2.2, z, 1.2, 3.4, 1.5);
  B.box(.2, 4.2, .35, MAT.woodDark, x - w / 2 + .5, 4.5, z, 0, 1); B.box(.2, .35, 2.2, MAT.woodDark, x - w / 2 + .5, 5.4, z, 0, 1);
  for (const s of [-1.1, -.5, .5, 1.1]) { const cx = x - w / 2 + 2.2, cz = z + s; B.add(new THREE.CylinderGeometry(.05, .05, .35 + Math.abs(s) * .1, 8), MAT.candle, M(cx, 1.8 + Math.abs(s) * .05, cz)); World.flames.push(new THREE.Vector3(cx, 2.03 + Math.abs(s) * .1, cz)); }
  addLightSource(x - w / 2 + 3, 2.6, z, 0xffa860, 28, 18, false, .25);
  addLightSource(x + 2, 6, z, 0xffd2a0, 18, 22, false, 0);
  // confessional
  const cx = x + 11.5, cz = z - d / 2 + 1.4;
  B.box(3.2, 2.8, 1.8, MAT.woodDark, cx, 1.4, cz - .2, 0, 1); B.box(3.4, .2, 2.0, MAT.woodDark, cx, 2.9, cz - .2, 0, 1);
  B.add(new THREE.PlaneGeometry(1.0, 2.0), MAT.fabric, M(cx - .8, 1.2, cz + .72)); B.add(new THREE.PlaneGeometry(1.0, 2.0), MAT.fabric, M(cx + .8, 1.2, cz + .72));
  addBoxC(cx, cz - .2, 3.2, 1.8, 2.8);
  PLACES.confession = { x: cx, z: cz + 1.6, r: 1.8 };
  addCollider(x - w / 2, x + w / 2, z - d / 2, z + d / 2, h, h + 9, { noCam: true });
  addCollider(x + 9, x + 13, z - 2, z + 2, h, h + 22, { noCam: true });
}
function buildGym(B) {
  const x = 62, z = 0, w = 34, d = 26, h = 10;
  hollow(B, { x, z, w, d, h, mat: MAT.brick, doors: [{ side: 'w', at: 0, w: 4, h: 3.6 }, { side: 's', at: 0, w: 3, h: 3.2 }], floorMat: MAT.court, floorS: 'wood', ceiling: true });
  addCollider(x - w / 2, x + w / 2, z - d / 2, z + d / 2, 0, .06, { noCam: true });
  { const lines = canvasTex(1024, 512, (g, W, H) => { g.clearRect(0, 0, W, H); g.strokeStyle = 'rgba(250,250,245,.9)'; g.lineWidth = 5; g.strokeRect(40, 30, W - 80, H - 60); g.beginPath(); g.moveTo(W / 2, 30); g.lineTo(W / 2, H - 30); g.stroke(); g.beginPath(); g.arc(W / 2, H / 2, 70, 0, TAU); g.stroke(); g.fillStyle = 'rgba(130,24,30,.78)'; g.fillRect(40, H / 2 - 70, 170, 140); g.fillRect(W - 210, H / 2 - 70, 170, 140); g.strokeRect(40, H / 2 - 70, 170, 140); g.strokeRect(W - 210, H / 2 - 70, 170, 140); g.beginPath(); g.arc(210, H / 2, 70, -Math.PI / 2, Math.PI / 2); g.stroke(); g.beginPath(); g.arc(W - 210, H / 2, 70, Math.PI / 2, Math.PI * 1.5); g.stroke(); g.save(); g.translate(W / 2, H / 2); g.fillStyle = 'rgba(130,24,30,.85)'; g.font = 'bold 54px Georgia,serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('LIONS', 0, 0); g.restore(); }, { repeat: false });
    const dm = new THREE.Mesh(new THREE.PlaneGeometry(w - .45, d - .45), new THREE.MeshStandardMaterial({ map: lines, transparent: true, roughness: .45, polygonOffset: true, polygonOffsetFactor: -2, depthWrite: false }));
    dm.rotation.x = -Math.PI / 2; dm.position.set(x, .062, z); dm.receiveShadow = true; dm.visible = false; World.group.add(dm); World.courtDecal = dm; }
  B.box(w + 1.2, 1, d + 1.2, MAT.trim, x, h + .6, z, 0, 2);
  for (const sx of [-w / 2, w / 2]) for (const sz of [-d / 2, d / 2]) B.box(1, h + 1, 1, MAT.stone, x + sx, (h + 1) / 2, z + sz, 0, 2);
  windowRow(B, { x0: x - 14, x1: x + 14, z: z + d / 2 + .23, y: 7.6, face: 'z+', w: 2.6, h: 1.4, step: 4, litChance: .9, lit2: .8 });
  windowRow(B, { x0: x - 14, x1: x + 14, z: z - d / 2 - .23, y: 7.6, face: 'z-', w: 2.6, h: 1.4, step: 4, litChance: .9, lit2: .8 });
  windowRow(B, { x0: z - 10, x1: z + 10, z: x + w / 2 + .23, y: 7.6, face: 'x+', w: 2.6, h: 1.4, step: 5, litChance: .9, lit2: .8 });
  const sign = textTex('GYMNASIUM', { w: 1024, h: 128, size: 76, color: '#e9e2d0', letter: 22 });
  B.add(new THREE.PlaneGeometry(9, 1.1), new THREE.MeshStandardMaterial({ map: sign, transparent: true }), M(x - w / 2 - .24, 5.2, z, -Math.PI / 2));
  B.box(.5, .4, 6, MAT.trim, x - w / 2 - .4, 3.9, z, 0, 1);
  // interior
  for (let i = 0; i < 4; i++) { B.box(28, .45, .9, MAT.wood, x, .225 + i * .45, z - d / 2 + 1 + i * .9, 0, 2); B.box(28, .45 * (i + 1), .9, MAT.wood, x, .225 * (i + 1), z - d / 2 + 1 + i * .9, 0, 2); addBoxC(x, z - d / 2 + 1 + i * .9, 28, .9, .45 * (i + 1), 0, { noCam: true }); }
  for (let i = 0; i < 3; i++) for (let j = 0; j < 4; j++) B.box(2.4, .12, 1, MAT.lightPanel, x - 9 + i * 9, h - .1, z - 8 + j * 5.3);
  const banner = textTex("ST. AGATHA'S LIONS", { w: 1024, h: 256, size: 78, color: '#e9d9a8', bg: '#7a1a1e', letter: 8 });
  B.add(new THREE.PlaneGeometry(12, 3), new THREE.MeshStandardMaterial({ map: banner, roughness: .9, side: THREE.DoubleSide }), M(x + w / 2 - .26, 6.5, z, -Math.PI / 2));
  const banner2 = textTex('DANCE · STATE FINALISTS 2003', { w: 1024, h: 160, size: 60, color: '#1a1a1a', bg: '#d8c89c', letter: 4 });
  B.add(new THREE.PlaneGeometry(9, 1.4), new THREE.MeshStandardMaterial({ map: banner2, roughness: .9 }), M(x, 7.6, z + d / 2 - .26, Math.PI));
  for (const s of [-1, 1]) { B.box(.1, 1.1, 1.8, MAT.white, x + s * (w / 2 - 1.2), 3.6, z, 0, 1); B.add(new THREE.TorusGeometry(.23, .02, 6, 16), new THREE.MeshStandardMaterial({ color: 0xd2541c }), M(x + s * (w / 2 - 1.5), 3.05, z, 0, 1, 1, 1, Math.PI / 2)); B.box(.1, 3.5, .1, MAT.metal, x + s * (w / 2 - .5), 5.0, z, 0, 1); }
  addLightSource(x - 6, h - 1, z, 0xf2f4ff, 38, 28, false); addLightSource(x + 8, h - 1, z, 0xf2f4ff, 38, 28, false);
  PLACES.gym_floor = { x: x, z: z + 3, r: 6 };
}
function buildDiner(B) {
  const x = -150, z = 162, w = 18, d = 10, h = 4.4;
  const panel = new THREE.MeshStandardMaterial({ map: canvasTex(128, 128, (g, W, H) => { g.fillStyle = '#e9e6dc'; g.fillRect(0, 0, W, H); g.fillStyle = '#9e1f26'; g.fillRect(0, H * .62, W, H * .1); g.fillStyle = '#b8b4aa'; g.fillRect(0, H * .9, W, H * .1); g.fillStyle = 'rgba(0,0,0,.08)'; for (let i = 0; i < W; i += 16) g.fillRect(i, 0, 2, H); }), roughness: .35, metalness: .4 });
  hollow(B, { x, z, w, d, h, mat: panel, doors: [{ side: 'n', at: 0, w: 2.2, h: 2.8 }], floorMat: MAT.checker, floorS: 'concrete' });
  addCollider(x - w / 2, x + w / 2, z - d / 2, z + d / 2, 0, .06, { noCam: true });
  B.box(w + 1.6, .5, d + 1.6, MAT.metalLight, x, h + .35, z, 0, 2);
  windowRow(B, { x0: x - 7.5, x1: x - 2.5, z: z - d / 2 - .23, y: 2.6, face: 'z-', w: 2.3, h: 1.5, step: 2.5, litChance: 1, lit2: 0 });
  windowRow(B, { x0: x + 2.5, x1: x + 7.5, z: z - d / 2 - .23, y: 2.6, face: 'z-', w: 2.3, h: 1.5, step: 2.5, litChance: 1, lit2: 0 });
  // neon sign
  const neon = textTex("DALE'S", { w: 512, h: 160, size: 120, color: '#ffd6e0', glow: '#ff3d6e', font: 'Georgia,serif', weight: '700' });
  const neonMat = new THREE.MeshStandardMaterial({ map: neon, emissiveMap: neon, emissive: 0xff5a86, emissiveIntensity: 1, transparent: true, depthWrite: false });
  B.box(7, 2, .3, MAT.black, x, h + 1.8, z - d / 2 + .5);
  B.add(new THREE.PlaneGeometry(6.6, 2.0), neonMat, M(x, h + 1.8, z - d / 2 + .3, Math.PI));
  const neon2 = textTex('DINER · OPEN LATE', { w: 512, h: 96, size: 36, color: '#d8fff6', glow: '#2ee6c8', letter: 6 });
  B.add(new THREE.PlaneGeometry(5.4, 1.0), new THREE.MeshStandardMaterial({ map: neon2, emissiveMap: neon2, emissive: 0x4af0d4, emissiveIntensity: 1, transparent: true, depthWrite: false }), M(x, 3.95, z - d / 2 - .26, Math.PI));
  World.nightFns.push(n => { neonMat.emissiveIntensity = lerp(.7, 2.6, n) * (Math.random() < .004 ? .2 : 1); });
  // interior
  B.box(12, 1.05, .8, MAT.metalLight, x, .55, z + 3, 0, 1); B.box(12.4, .08, 1.0, MAT.red, x, 1.1, z + 3, 0, 1); addBoxC(x, z + 3, 12, .8, 1.1);
  for (let i = 0; i < 7; i++) { B.add(new THREE.CylinderGeometry(.22, .22, .1, 14), MAT.red, M(x - 5.4 + i * 1.8, .75, z + 1.9)); B.add(new THREE.CylinderGeometry(.04, .04, .7, 6), MAT.metalLight, M(x - 5.4 + i * 1.8, .38, z + 1.9)); }
  for (const bx of [-6, -2, 2, 6]) { B.box(1.6, .08, .9, MAT.white, x + bx, .78, z - 3.6); B.box(.1, .75, .1, MAT.metalLight, x + bx, .38, z - 3.6); B.box(.5, .5, 1.6, MAT.red, x + bx - 1.1, .25, z - 3.6); B.box(.5, .5, 1.6, MAT.red, x + bx + 1.1, .25, z - 3.6); B.box(.15, .9, 1.6, MAT.red, x + bx - 1.35, .7, z - 3.6); B.box(.15, .9, 1.6, MAT.red, x + bx + 1.35, .7, z - 3.6); addBoxC(x + bx, z - 3.6, 3, 1.6, .85, 0, { noCam: true }); }
  for (let i = 0; i < 3; i++) B.box(2.2, .1, .6, MAT.lightPanel, x - 5 + i * 5, h - .1, z);
  addLightSource(x, 3.6, z, 0xfff0d8, 30, 18, false);
  addLightSource(x, h + 2, z - d / 2 - 1.5, 0xff5a86, 30, 14, true);
  PLACES.diner = { x: x + 2, z: z - 3.6, r: 2.4, label: "Dale's Diner" };
}
function buildGas(B) {
  const x = -110, z = 162;
  for (const [sx, sz] of [[-6, -4], [6, -4], [-6, 4], [6, 4]]) { B.box(.4, 5, .4, MAT.white, x + sx, 2.5, z + sz, 0, 1); addBoxC(x + sx, z + sz, .4, .4, 5); }
  B.box(14, .8, 10, MAT.white, x, 5.3, z, 0, 2); B.box(14.2, .3, 10.2, MAT.red, x, 5.0, z, 0, 2);
  for (const sx of [-3.5, 3.5]) { B.box(5, .06, 1, MAT.lightPanel, x + sx, 4.86, z - 2); B.box(5, .06, 1, MAT.lightPanel, x + sx, 4.86, z + 2); }
  for (const sx of [-3, 3]) { B.box(.8, 1.7, .5, MAT.red, x + sx, .85, z, 0, 1); B.box(.6, .5, .52, MAT.glassDark, x + sx, 1.3, z); addBoxC(x + sx, z, .8, .5, 1.7); }
  B.box(.6, 1.6, 6, MAT.concreteSolid, x, .3, z, 0, 2);
  hollow(B, { x, z: z + 11, w: 10, d: 6, h: 3.6, mat: MAT.siding, doors: [], ceiling: true });
  windowRow(B, { x0: x - 3, x1: x + 3, z: z + 8 - .23, y: 1.8, face: 'z-', w: 2.4, h: 1.6, step: 3, litChance: 1, lit2: 0 });
  const gs = textTex('GAS · SNACKS · ICE', { w: 512, h: 96, size: 48, color: '#fff', bg: '#7e1d20', letter: 6 });
  B.add(new THREE.PlaneGeometry(8, 1.4), new THREE.MeshStandardMaterial({ map: gs, emissiveMap: gs, emissive: 0xffffff, emissiveIntensity: .6 }), M(x, 5.3, z - 5.03, Math.PI));
  addLightSource(x, 4.2, z, 0xf4f6ff, 60, 22, false);
}
function buildHouses(B) {
  const tints = [0xd9d0bc, 0xb8c4c8, 0xc9b9a0, 0xa9b39a, 0xd2c2c4, 0xe0dccf];
  const spots = [[-200, 118, 0], [-235, 116, 0], [-270, 118, 0], [-305, 117, 0], [-205, 164, Math.PI], [-240, 166, Math.PI], [-275, 164, Math.PI], [-310, 166, Math.PI]];
  spots.forEach(([x, z, ry], i) => {
    const w = 11, d = 8, h = 5.2, faceZ = ry === 0 ? 1 : -1;
    const mat = new THREE.MeshStandardMaterial({ map: TEX.siding, color: tints[i % tints.length], roughness: .8 });
    B.box(w, h, d, mat, x, h / 2, z, 0, 1.6); B.box(w + .4, .6, d + .4, MAT.stoneDark, x, .3, z, 0, 2);
    const roof = gableGeo(w, d, 3.4, .7); B.add(roof, MAT.shingle, M(x, h, z));
    B.box(1.1, 3, 1.1, MAT.brick, x + 3, h + 2, z);
    const fz = z + faceZ * (d / 2);
    B.box(1.2, 2.3, .1, MAT.woodDark, x - 1.5, 1.15 + .6, fz + faceZ * .06, 0, 1);
    windowRow(B, { x0: x + 1, x1: x + 4, z: fz, y: 2.2, face: faceZ > 0 ? 'z+' : 'z-', w: 1.3, h: 1.6, step: 3, litChance: .7 });
    windowRow(B, { x0: x - 3.5, x1: x + 3.5, z: fz, y: 4.0, face: faceZ > 0 ? 'z+' : 'z-', w: 1.1, h: 1.1, step: 3.5, litChance: .5 });
    B.box(4, .2, 2.4, MAT.woodWeather, x - 1.5, .7, fz + faceZ * 1.2, 0, 1);
    B.box(4.2, .15, 2.6, MAT.woodWeather, x - 1.5, 3.0, fz + faceZ * 1.2, 0, 1);
    for (const px of [-3.3, .3]) B.box(.14, 2.3, .14, MAT.white, x + px, 1.85, fz + faceZ * 2.3, 0, 1);
    B.box(.25, .3, .12, MAT.lampGlass, x - .6, 2.4, fz + faceZ * .12);
    addLightSource(x - .6, 2.4, fz + faceZ * .6, 0xffc27a, 10, 9, true);
    addBoxC(x, z, w, d, h + 3); FOOTPRINTS.push({ minX: x - w / 2 - 1, maxX: x + w / 2 + 1, minZ: z - d / 2 - 3, maxZ: z + d / 2 + 3 });
    // mailbox & fence
    B.box(.12, 1.1, .12, MAT.woodDark, x + 4, .55, fz + faceZ * 7, 0, 1); B.box(.3, .3, .5, MAT.metal, x + 4, 1.2, fz + faceZ * 7);
    World.extraTrees.push({ x: x - 7.5, z: z + faceZ * 6, kind: 'oak' });
  });
}
function buildField(B) {
  const cx = 70, cz = 85;
  const f = new THREE.Mesh(new THREE.PlaneGeometry(92, 46), MAT.field); f.rotation.x = -Math.PI / 2; f.position.set(cx, .04, cz); f.receiveShadow = true; World.group.add(f);
  FOOTPRINTS.push({ minX: cx - 46, maxX: cx + 46, minZ: cz - 23, maxZ: cz + 23 });
  const yel = new THREE.MeshStandardMaterial({ color: 0xd8b53c, roughness: .5 });
  for (const s of [-1, 1]) { const gx = cx + s * 45; B.box(.3, 3, .3, yel, gx, 1.5, cz, 0, 1); B.box(.2, .2, 5.6, yel, gx, 3, cz, 0, 1); for (const e of [-2.8, 2.8]) B.box(.15, 6, .15, yel, gx, 6, cz + e, 0, 1); addCircleC(gx, cz, .3, 3); }
  // bleachers on the north side
  for (let i = 0; i < 6; i++) { const zc = 61 - (i + .5) * .9; B.box(52, .12, .9, MAT.metalLight, cx, .45 * (i + 1), zc, 0, 2); B.box(52, .45 * (i + 1) - .12, .1, MAT.metal, cx, (.45 * (i + 1) - .12) / 2, zc + .45, 0, 2); addCollider(cx - 26, cx + 26, zc - .45, zc + .45, 0, .45 * (i + 1), { noCam: true }); }
  B.box(52, 2.8, .1, MAT.metal, cx, 1.4, 55.55, 0, 2); addCollider(cx - 26, cx + 26, 55.4, 55.6, 0, 3.9);
  for (let i = 0; i < 6; i++) B.box(.1, 1.2, .1, MAT.metalLight, cx - 25 + i * 10, 3.3, 55.6);
  B.box(52, .08, .08, MAT.metalLight, cx, 3.85, 55.6);
  // floodlights
  for (const [sx, sz] of [[-48, -26], [48, -26], [-48, 26], [48, 26]]) {
    const px = cx + sx, pz = cz + sz;
    B.add(new THREE.CylinderGeometry(.18, .3, 18, 8), MAT.metal, M(px, 9, pz)); addCircleC(px, pz, .35, 18);
    B.box(4, 2.2, .4, MAT.metal, px, 18.6, pz, Math.atan2(cx - px, cz - pz));
    const panel = new THREE.Mesh(boxGeo(3.6, 1.8, .1), MAT.flood); panel.position.set(px - Math.sin(Math.atan2(px - cx, pz - cz)) * .3, 18.6, pz - Math.cos(Math.atan2(px - cx, pz - cz)) * .3); panel.rotation.y = Math.atan2(cx - px, cz - pz); World.group.add(panel);
    addLightSource(px - Math.sign(sx) * 4, 16, pz - Math.sign(sz) * 4, 0xeef2ff, 400, 70, true);
  }
  World.nightFns.push(n => { MAT.flood.emissiveIntensity = n * 6; });
  // scoreboard
  const sb = textTex('LIONS  21 · 14  VISITOR', { w: 1024, h: 192, size: 82, color: '#ffcc55', bg: '#0d0d0f', glow: '#ff9900', letter: 4 });
  B.box(12, 4, .5, MAT.black, cx + 56, 7, cz); B.box(.4, 6, .4, MAT.metal, cx + 56, 3, cz - 4); B.box(.4, 6, .4, MAT.metal, cx + 56, 3, cz + 4);
  B.add(new THREE.PlaneGeometry(11, 2.2), new THREE.MeshStandardMaterial({ map: sb, emissiveMap: sb, emissive: 0xffffff, emissiveIntensity: 1.2 }), M(cx + 55.73, 7, cz, -Math.PI / 2));
  addBoxC(cx + 56, cz, .5, 12, 9);
}
function buildWaterTower(B) {
  const x = 150, z = -40;
  for (const [sx, sz] of [[-4, -4], [4, -4], [-4, 4], [4, 4]]) { B.add(new THREE.CylinderGeometry(.25, .3, 22, 6), MAT.metalLight, M(x + sx, 11, z + sz, 0, 1, 1, 1, sz * .025, -sx * .025)); addCircleC(x + sx, z + sz, .35, 22); }
  for (const y of [7, 15]) { B.box(8.2, .15, .15, MAT.metalLight, x, y, z - 3.8); B.box(8.2, .15, .15, MAT.metalLight, x, y, z + 3.8); B.box(.15, .15, 8.2, MAT.metalLight, x - 3.8, y, z); B.box(.15, .15, 8.2, MAT.metalLight, x + 3.8, y, z); }
  const tank = new THREE.CylinderGeometry(6.5, 6.5, 7, 28); B.add(tank, new THREE.MeshStandardMaterial({ color: 0x9aa4a8, roughness: .45, metalness: .7 }), M(x, 25.5, z));
  B.add(new THREE.ConeGeometry(6.8, 3, 28), MAT.metalLight, M(x, 30.5, z));
  const wt = textTex('FAIRHAVEN', { w: 1024, h: 160, size: 110, color: '#2a2e33', letter: 20 });
  const wm = new THREE.Mesh(new THREE.CylinderGeometry(6.53, 6.53, 2, 28, 1, true, -.9, 1.8), new THREE.MeshStandardMaterial({ map: wt, transparent: true, roughness: .5 })); wm.position.set(x, 25.5, z); wm.rotation.y = Math.PI * 1.25; World.group.add(wm);
  const red = new THREE.Mesh(new THREE.SphereGeometry(.3, 8, 8), MAT.redLight); red.position.set(x, 32.3, z); World.group.add(red);
  World.updaters.push((dt, t) => { red.visible = Math.sin(t * 2.4) > .2; });
}
function buildBoathouse(B) {
  const x = 42, z = -206, w = 8, d = 7, fy = .7;
  for (const [sx, sz] of [[-4, -3.5], [4, -3.5], [-4, 3.5], [4, 3.5], [0, -3.5], [0, 3.5]]) B.box(.3, 3, .3, MAT.woodDark, x + sx, fy - 1.5, z + sz, 0, 1);
  B.box(w, .2, d, MAT.woodWeather, x, fy - .1, z, 0, 1); addBoxC(x, z, w, d, fy, -3, { noCam: true });
  hollow(B, { x, z, w, d, h: 3.4, t: .25, mat: MAT.woodWeather, doors: [{ side: 'w', at: 0, w: 1.6, h: 3.0 }, { side: 'e', at: 0, w: 4, h: 3.0 }], roof: 'gable', roofMat: MAT.shingle, roofH: 2.6, ceiling: false });
  // hollow() builds at y=0; lift walls visually by adding plinth illusion: walls start at ground, floor raised
  FLOORS.push({ minX: x - w / 2, maxX: x + w / 2, minZ: z - d / 2, maxZ: z + d / 2, s: 'wood' });
  for (let i = 0; i < 2; i++) { B.box(1, .35, 1.8, MAT.woodWeather, x - w / 2 - .5 - (1 - i), .35 * (i + 1) / 2, z, 0, 1); addBoxC(x - w / 2 - .5 - (1 - i), z, 1, 1.8, .35 * (i + 1), -1, { noCam: true }); }
  // dock
  for (let i = 0; i < 16; i++) B.box(1, .12, 2.6, MAT.woodWeather, x + w / 2 + .5 + i, fy - .06, z + rr(-.04, .04), rr(-.02, .02), 1);
  addCollider(x + w / 2, x + w / 2 + 16, z - 1.3, z + 1.3, -3, fy, { noCam: true });
  FLOORS.push({ minX: x + w / 2, maxX: x + w / 2 + 16, minZ: z - 1.3, maxZ: z + 1.3, s: 'wood' });
  for (let i = 0; i <= 16; i += 4) for (const s of [-1.3, 1.3]) B.add(new THREE.CylinderGeometry(.12, .12, 3, 6), MAT.woodDark, M(x + w / 2 + .5 + i, fy - 1.2, z + s));
  B.add(new THREE.CylinderGeometry(.05, .05, 1.6, 6), MAT.metal, M(x + w / 2 + 15.5, fy + .8, z + 1.2));
  B.box(.3, .4, .3, MAT.lampGlass, x + w / 2 + 15.5, fy + 1.7, z + 1.2);
  addLightSource(x + w / 2 + 15.5, fy + 1.7, z + 1.2, 0xffb060, 14, 14, true, .1);
  // rowboat
  const hull = new THREE.SphereGeometry(1, 16, 8, 0, TAU, Math.PI / 2, Math.PI / 2); hull.scale(1.0, .5, 2.4);
  const boat = new THREE.Mesh(hull, new THREE.MeshStandardMaterial({ color: 0x5a6a5e, roughness: .8, side: THREE.DoubleSide })); boat.position.set(x + w / 2 + 12, LAKE.y + .35, z + 2.6); boat.rotation.y = .3; boat.castShadow = true; World.group.add(boat);
  World.updaters.push((dt, t) => { boat.position.y = LAKE.y + .32 + Math.sin(t * 1.1) * .05; boat.rotation.z = Math.sin(t * .9) * .04; });
  // inside: crates, lantern
  B.box(1, .8, 1, MAT.woodDark, x - 2.6, fy + .4, z - 2.4, .3, 1); B.box(.8, .6, .8, MAT.woodDark, x - 2.4, fy + 1.1, z - 2.3, .7, 1); addBoxC(x - 2.6, z - 2.4, 1.2, 1.2, fy + 1.4);
  addLightSource(x, 2.8, z, 0xffa860, 8, 9, false, .3);
  PLACES.boathouse = { x: x - 1, z: z + 1, r: 2.5, label: 'Boathouse' };
}
function buildClearing(B) {
  const x = -40, z = -165;
  for (let i = 0; i < 9; i++) { const a = i / 9 * TAU + .2; const r = 9.5; const g = new THREE.IcosahedronGeometry(1, 1); { const pp = g.attributes.position; for (let k = 0; k < pp.count; k++) { const n = 1 + noise2(pp.getX(k) * 2 + i * 7, pp.getY(k) * 2 + pp.getZ(k)) * .25; pp.setXYZ(k, pp.getX(k) * n, pp.getY(k) * n, pp.getZ(k) * n); } g.computeVertexNormals(); } const px = x + Math.cos(a) * r, pz = z + Math.sin(a) * r; B.add(g, MAT.rock, M(px, heightAt(px, pz) + .6, pz, a + rr(-.3, .3), rr(.5, .7), rr(1.2, 1.7), rr(.35, .5))); addCircleC(px, pz, .9, 3); }
  for (let i = 0; i < 14; i++) { const a = i / 14 * TAU; B.add(new THREE.DodecahedronGeometry(.32, 0), MAT.rock, M(x + Math.cos(a) * 1.4, heightAt(x, z) + .12, z + Math.sin(a) * 1.4, rr(0, 3))); }
  const ash = new THREE.Mesh(new THREE.CircleGeometry(1.25, 20), MAT.ash); ash.rotation.x = -Math.PI / 2; ash.position.set(x, heightAt(x, z) + .08, z); World.group.add(ash);
  for (let i = 0; i < 4; i++) B.add(new THREE.CylinderGeometry(.11, .13, 1.5, 6), MAT.ember, M(x + rr(-.3, .3), heightAt(x, z) + .2, z + rr(-.3, .3), rr(0, 3), 1, 1, 1, Math.PI / 2 + rr(-.3, .3)));
  addLightSource(x, heightAt(x, z) + .8, z, 0xff6a20, 20, 14, false, .5);
  for (const [a, r] of [[.8, 5.2], [2.6, 5.4], [4.4, 5]]) { const px = x + Math.cos(a) * r, pz = z + Math.sin(a) * r; B.add(new THREE.CylinderGeometry(.35, .38, 2.4, 10), MAT.woodDark, M(px, heightAt(px, pz) + .3, pz, a + Math.PI / 2, 1, 1, 1, Math.PI / 2)); addBoxC(px, pz, 1.4, 1.4, .6, -1, { noCam: true }); }
  // candles in a ring
  for (let i = 0; i < 13; i++) { const a = i / 13 * TAU; const px = x + Math.cos(a) * 3.2, pz = z + Math.sin(a) * 3.2, y0 = heightAt(px, pz); const hh = rr(.15, .32); B.add(new THREE.CylinderGeometry(.045, .05, hh, 8), MAT.candle, M(px, y0 + hh / 2, pz)); World.flames.push(new THREE.Vector3(px, y0 + hh + .05, pz)); }
}
function buildFountain(B) {
  const x = 0, z = 0;
  const outer = new THREE.LatheGeometry([new THREE.Vector2(4.2, 0), new THREE.Vector2(4.6, 0), new THREE.Vector2(4.7, .65), new THREE.Vector2(4.4, .75), new THREE.Vector2(4.2, .7), new THREE.Vector2(4.2, .1)], 48);
  B.add(scaleUV(outer, 6, 1), MAT.stone, M(x, 0, z));
  B.add(new THREE.CylinderGeometry(.5, .7, 2.2, 16), MAT.stone, M(x, 1.1, z));
  const bowl = new THREE.LatheGeometry([new THREE.Vector2(.2, 0), new THREE.Vector2(1.6, .3), new THREE.Vector2(1.8, .55), new THREE.Vector2(1.6, .5), new THREE.Vector2(.2, .25)], 32);
  B.add(bowl, MAT.stone, M(x, 2.1, z));
  B.add(new THREE.CylinderGeometry(.18, .25, 1.0, 12), MAT.stone, M(x, 3.0, z)); B.add(new THREE.SphereGeometry(.3, 12, 8), MAT.stone, M(x, 3.6, z));
  const w1 = new THREE.Mesh(new THREE.CircleGeometry(4.25, 40), MAT.water); w1.rotation.x = -Math.PI / 2; w1.position.set(x, .5, z); World.group.add(w1);
  const w2 = new THREE.Mesh(new THREE.CircleGeometry(1.6, 24), MAT.water); w2.rotation.x = -Math.PI / 2; w2.position.set(x, 2.55, z); World.group.add(w2);
  World.fountainWater = w1;
  addCircleC(x, z, 4.7, .75);
  // spray particles
  const N = 420, pos = new Float32Array(N * 3), seed = new Float32Array(N);
  for (let i = 0; i < N; i++) seed[i] = Math.random();
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const tex = canvasTex(32, 32, (c, w, h) => { const gr = c.createRadialGradient(16, 16, 0, 16, 16, 16); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); c.fillStyle = gr; c.fillRect(0, 0, w, h); }, { repeat: false });
  World.softDot = tex;
  const pts = new THREE.Points(g, new THREE.PointsMaterial({ size: .09, map: tex, transparent: true, opacity: .6, depthWrite: false, color: 0xcfe3ee }));
  World.group.add(pts);
  World.updaters.push((dt, t) => {
    for (let i = 0; i < N; i++) {
      const ph = (t * .55 + seed[i]) % 1, a = seed[i] * 97.3;
      const r = ph * 1.5 + .1, top = i % 3 === 0;
      if (top) { pos[i * 3] = Math.cos(a) * ph * .9; pos[i * 3 + 1] = 3.9 + ph * .5 - ph * ph * 1.8; pos[i * 3 + 2] = Math.sin(a) * ph * .9; }
      else { pos[i * 3] = Math.cos(a) * (1.7 + ph * .25); pos[i * 3 + 1] = 2.6 - ph * ph * 2.1; pos[i * 3 + 2] = Math.sin(a) * (1.7 + ph * .25); }
      void r;
    }
    g.attributes.position.needsUpdate = true;
  });
}
function buildStatue(B) {
  const x = 0, z = 26;
  B.box(1.8, 1.4, 1.8, MAT.stone, x, .7, z, 0, 2); B.box(2.2, .3, 2.2, MAT.stone, x, .15, z, 0, 2);
  const robe = new THREE.LatheGeometry([new THREE.Vector2(.0, 0), new THREE.Vector2(.62, 0), new THREE.Vector2(.55, .5), new THREE.Vector2(.42, 1.2), new THREE.Vector2(.36, 1.6), new THREE.Vector2(.42, 1.75), new THREE.Vector2(.2, 1.95), new THREE.Vector2(0, 1.98)], 24);
  const sm = new THREE.MeshStandardMaterial({ map: TEX.stone, color: 0xb9b4a8, roughness: .8 });
  B.add(robe, sm, M(x, 1.4, z));
  B.add(new THREE.SphereGeometry(.2, 16, 12), sm, M(x, 3.55, z + .02));
  B.add(new THREE.SphereGeometry(.26, 16, 12, 0, TAU, 0, 1.7), sm, M(x, 3.6, z - .02)); // veil
  B.add(new THREE.CapsuleGeometry(.08, .5, 4, 8), sm, M(x - .2, 2.85, z + .28, 0, 1, 1, 1, -1.1, -.3));
  B.add(new THREE.CapsuleGeometry(.08, .5, 4, 8), sm, M(x + .2, 2.85, z + .28, 0, 1, 1, 1, -1.1, .3));
  B.add(new THREE.TorusGeometry(.28, .03, 6, 20), MAT.gold, M(x, 3.92, z - .05, 0, 1, 1, 1, -.25));
  addCircleC(x, z, 1.3, 4);
  const plaque = textTex('S. AGATHA · ORA PRO NOBIS', { w: 512, h: 64, size: 32, color: '#3a3226', letter: 3 });
  B.add(new THREE.PlaneGeometry(1.6, .2), new THREE.MeshStandardMaterial({ map: plaque, transparent: true }), M(x, .9, z - .91, Math.PI));
}
function buildFlag() {
  const x = -14, z = -21, y0 = 0;
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(.06, .09, 12, 8), MAT.metalLight); pole.position.set(x, 6, z); pole.castShadow = true; World.group.add(pole);
  addCircleC(x, z, .15, 12);
  const ft = canvasTex(256, 160, (g, w, h) => { g.fillStyle = '#7a1a1e'; g.fillRect(0, 0, w, h); g.fillStyle = '#d6b866'; g.fillRect(0, h * .78, w, h * .08); g.font = '700 70px Georgia,serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('SA', w / 2, h * .42); }, { repeat: false });
  const fg = new THREE.PlaneGeometry(3.2, 2, 20, 10); fg.translate(1.6, 0, 0);
  const flag = new THREE.Mesh(fg, new THREE.MeshStandardMaterial({ map: ft, side: THREE.DoubleSide, roughness: .9 })); flag.position.set(x + .08, y0 + 10.8, z); flag.castShadow = true; World.group.add(flag);
  const base = fg.attributes.position.array.slice();
  World.updaters.push((dt, t) => { const p = fg.attributes.position.array; for (let i = 0; i < p.length; i += 3) { const u = base[i] / 3.2; p[i + 2] = Math.sin(base[i] * 2.2 - t * 5) * .22 * u + Math.sin(base[i + 1] * 3 - t * 3) * .05 * u; p[i] = base[i] * (1 - .03 * u); } fg.attributes.position.needsUpdate = true; fg.computeVertexNormals(); });
}
function buildMisc(B) {
  // lamps along paths
  const okLamp = (x, z) => Math.hypot(x, z) > 11 && Math.hypot(x, z - 26) > 5.5;
  for (let z = -18; z <= 46; z += 16) { if (okLamp(-3.4, z)) lampPost(B, -3.4, z); if (okLamp(3.4, z + 8)) lampPost(B, 3.4, z + 8); }
  for (let x = -40; x <= 36; x += 16) { if (okLamp(x, -3)) lampPost(B, x, -3); if (okLamp(x + 8, 3)) lampPost(B, x + 8, 3); }
  for (let x = -44; x <= 44; x += 22) lampPost(B, x, -21.5);
  for (const [x, z] of [[-30, 58], [-60, 58], [-30, 82], [-60, 82], [62, 30], [62, 46], [-49, 30], [-49, 46], [54, -44], [-54, -44], [0, -64]]) lampPost(B, x, z);
  for (let x = -330; x <= 250; x += 34) lampPost(B, x, 133.5, 6);
  for (let z = 92; z <= 130; z += 18) lampPost(B, -50, z, 5);
  // benches
  World.seats = [];
  for (const [x, z, tx, tz] of [[-6.6, 8.9, 0, 0], [6.6, -8.9, 0, 0], [-8.9, -6.6, 0, 0], [8.9, 6.6, 0, 0], [-7, 20, 0, 22], [7, 32, 0, 30], [-20, 3.2, -20, 0], [20, -3.2, 20, 0], [-30, -21.2, -30, -24], [30, -21.2, 30, -24]]) {
    const fx = tx - x, fz = tz - z, ry = Math.atan2(-fx, -fz); bench(B, x, z, ry);
    const l = Math.hypot(fx, fz) || 1; World.seats.push({ x: x + fx / l * .12, z: z + fz / l * .12, yaw: Math.atan2(fx, fz) });
  }
  // campus trees (hand placed)
  for (const [x, z] of [[-16, 12], [16, 12], [-16, -12], [16, -12], [-24, 30], [24, 30], [-30, 44], [34, 22], [-36, -14], [36, -14], [-90, -10], [-88, 20], [-95, 50], [96, -20], [95, 25], [-26, -66], [24, -66], [-60, -40], [70, -30], [88, 40], [-70, 30], [-12, 70], [10, 72], [-80, 90], [-20, 100], [20, 104]]) World.extraTrees.push({ x, z, kind: 'oak' });
  // bike rack, trash cans, bollards
  for (let i = 0; i < 6; i++) B.add(new THREE.TorusGeometry(.4, .03, 6, 14, Math.PI), MAT.metalLight, M(-14 + i * .6, 0, -27.5));
  for (const [x, z] of [[-6, -3.6], [6, 3.6], [-5, 40], [40, -3], [-40, 3]]) { B.add(new THREE.CylinderGeometry(.3, .28, .9, 12), MAT.metal, M(x, .45, z)); addCircleC(x, z, .32, .9); }
  // bus shelter on the road
  B.box(4, .1, 1.6, MAT.metal, -20, 2.6, 134.5); B.box(4, 2.4, .05, MAT.glassDark, -20, 1.3, 135.3); B.box(1.2, .1, .4, MAT.woodDark, -20, .5, 135); addBoxC(-20, 135.3, 4, .2, 2.6);
  const sign = textTex("ST. AGATHA'S CATHOLIC HIGH SCHOOL", { w: 1024, h: 128, size: 50, color: '#e9e2d0', letter: 6 });
  B.box(7, 1.6, .5, MAT.brick, -36, .8, 128); B.add(new THREE.PlaneGeometry(6.4, .8), new THREE.MeshStandardMaterial({ map: sign, transparent: true }), M(-36, 1.0, 128.26)); addBoxC(-36, 128, 7, .5, 1.6);
  const town = textTex('FAIRHAVEN · POP. 4,210', { w: 512, h: 96, size: 40, color: '#f3f3f3', bg: '#1f5a3a', letter: 3 });
  B.box(.12, 2.4, .12, MAT.metalLight, -175, 1.2, 134); B.add(new THREE.PlaneGeometry(2.6, .5), new THREE.MeshStandardMaterial({ map: town, side: THREE.DoubleSide }), M(-175, 2.3, 134.05));
}

/* ---------- vegetation ---------- */
function shadeLeaf(g) { // fake canopy occlusion: darker underneath and inside, brighter crowns
  g.computeBoundingBox(); const bb = g.boundingBox, p = g.attributes.position, n = g.attributes.normal, c = new Float32Array(p.count * 3); const r = mulberry32(p.count);
  for (let i = 0; i < p.count; i++) { const h = (p.getY(i) - bb.min.y) / (bb.max.y - bb.min.y || 1); const up = n ? n.getY(i) * .5 + .5 : .5; const k = (.38 + .62 * Math.pow(h, .8)) * (.75 + up * .35) * (.9 + r() * .2); c[i * 3] = c[i * 3 + 1] = c[i * 3 + 2] = k; }
  g.setAttribute('color', new THREE.BufferAttribute(c, 3)); return g;
}
function buildTrees() {
  const pine = (() => { const parts = []; const tr = new THREE.CylinderGeometry(.18, .28, 3, 6); tr.translate(0, 1.5, 0); for (let i = 0; i < 4; i++) { const c = new THREE.ConeGeometry(2.2 - i * .45, 3.2 - i * .3, 9); c.translate(0, 3 + i * 1.9, 0); parts.push(c); } const f = mergeGeometries(parts.map(p => p.toNonIndexed())); return { trunk: tr, leaf: shadeLeaf(f) }; })();
  const oak = (() => { const tr = new THREE.CylinderGeometry(.22, .4, 4.2, 7); tr.translate(0, 2.1, 0); const parts = []; const r = mulberry32(5); for (let i = 0; i < 4; i++) { const s = new THREE.IcosahedronGeometry(1.8 + r() * .8, 1); const p = s.attributes.position; for (let k = 0; k < p.count; k++) { p.setXYZ(k, p.getX(k) * (1 + (r() - .5) * .25), p.getY(k) * (.85 + (r() - .5) * .2), p.getZ(k) * (1 + (r() - .5) * .25)); } s.translate((r() - .5) * 3, 4.6 + r() * 2.2, (r() - .5) * 3); parts.push(s); } const f = mergeGeometries(parts); return { trunk: tr, leaf: shadeLeaf(f) }; })();
  const birch = (() => { const tr = new THREE.CylinderGeometry(.12, .18, 6, 6); tr.translate(0, 3, 0); const parts = []; const r = mulberry32(9); for (let i = 0; i < 4; i++) { const s = new THREE.IcosahedronGeometry(1.0 + r() * .5, 1); s.translate((r() - .5) * 1.6, 4.5 + i * .8, (r() - .5) * 1.6); parts.push(s); } const f = mergeGeometries(parts); return { trunk: tr, leaf: shadeLeaf(f) }; })();
  const list = { pine: [], oak: [], birch: [] };
  const rng = mulberry32(42);
  for (let x = -480; x <= 480; x += 9.5) for (let z = -480; z <= 480; z += 9.5) {
    const px = x + (rng() - .5) * 7, pz = z + (rng() - .5) * 7;
    const d = treeDensity(px, pz); if (d <= 0 || rng() > d * .85) continue; if (treeBlocked(px, pz)) continue;
    const r = rng(); const kind = pz < -70 ? (r < .5 ? 'pine' : r < .85 ? 'oak' : 'birch') : (r < .35 ? 'pine' : r < .9 ? 'oak' : 'birch');
    list[kind].push({ x: px, z: pz, s: .8 + rng() * .6, ry: rng() * TAU });
  }
  for (const t of World.extraTrees) list[t.kind].push({ x: t.x, z: t.z, s: .9 + rng() * .3, ry: rng() * TAU });
  const leafPal = { pine: [0x223626, 0x2b4030, 0x1e3024, 0x2f3f2a], oak: [0xa8421c, 0xc8742a, 0xbe9632, 0x8a2c1c, 0x9c5426, 0x6a7230, 0xd08a30], birch: [0xd6b040, 0xc89a2c, 0xe0c060] };
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x4a3a2c, roughness: 1 });
  const birchMat = new THREE.MeshStandardMaterial({ color: 0xd8d2c4, roughness: .9 });
  const leafMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .8, vertexColors: true });
  leafMat.onBeforeCompile = s => {
    s.uniforms.uTime = U.time;
    s.vertexShader = 'uniform float uTime;\n' + s.vertexShader.replace('#include <begin_vertex>', `#include <begin_vertex>
      #ifdef USE_INSTANCING
        vec3 ip = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);
      #else
        vec3 ip = vec3(0.);
      #endif
      float sw = sin(uTime*1.2 + ip.x*.11 + ip.z*.09)*.6 + sin(uTime*2.9 + ip.x*.37)*.2;
      float hk = max(transformed.y - 2.0, 0.);
      transformed.x += sw * .05 * hk; transformed.z += sw * .03 * hk;`);
  };
  const CH = 160; World.treeChunks = []; // spatial chunks so frustum and shadow culling stay cheap
  const dummy = new THREE.Object3D(), col = new THREE.Color();
  for (const kind of Object.keys(list)) {
    const geo = kind === 'pine' ? pine : kind === 'oak' ? oak : birch;
    const chunks = new Map();
    for (const t of list[kind]) { const k = Math.floor(t.x / CH) + ',' + Math.floor(t.z / CH); if (!chunks.has(k)) chunks.set(k, []); chunks.get(k).push(t); addCircleC(t.x, t.z, kind === 'oak' ? .45 : .35, 8); }
    for (const arr of chunks.values()) {
      const tm = new THREE.InstancedMesh(geo.trunk, kind === 'birch' ? birchMat : trunkMat, arr.length);
      const lm = new THREE.InstancedMesh(geo.leaf, leafMat, arr.length);
      arr.forEach((t, i) => { dummy.position.set(t.x, heightAt(t.x, t.z) - .1, t.z); dummy.rotation.set(0, t.ry, 0); dummy.scale.setScalar(t.s); dummy.updateMatrix(); tm.setMatrixAt(i, dummy.matrix); lm.setMatrixAt(i, dummy.matrix); col.set(pick(leafPal[kind])).multiplyScalar(.85 + rand() * .3); lm.setColorAt(i, col); });
      for (const m of [tm, lm]) { m.castShadow = true; m.receiveShadow = true; m.computeBoundingSphere(); World.group.add(m); World.treeChunks.push(m); }
    }
  }
  World.treeCount = list.pine.length + list.oak.length + list.birch.length;
}
function buildGrass() {
  // mask texture: where grass may grow
  const MS = 512, md = new Uint8Array(MS * MS);
  for (let j = 0; j < MS; j++) for (let i = 0; i < MS; i++) {
    const x = -500 + (i + .5) / MS * 1000, z = -500 + (j + .5) / MS * 1000;
    let v = 1;
    const s = surfaceAt(x, z); if (s !== 'grass' && s !== 'leaves') v = 0; else if (s === 'leaves') v = .45;
    if (v > 0) { for (const f of FOOTPRINTS) if (inRect(x, z, f)) { v = 0; break; } }
    if (v > 0 && Math.hypot(x - LAKE.x, z - LAKE.z) < LAKE.r + 1) v = 0;
    md[j * MS + i] = v * 255;
  }
  World.maskTex = new THREE.DataTexture(md, MS, MS, THREE.RedFormat, THREE.UnsignedByteType); World.maskTex.magFilter = THREE.LinearFilter; World.maskTex.minFilter = THREE.LinearFilter; World.maskTex.needsUpdate = true;
  // blade tuft geometry
  const blades = []; for (let b = 0; b < 3; b++) { const g = new THREE.PlaneGeometry(.07, 1, 1, 3); g.translate(0, .5, 0); const p = g.attributes.position; for (let k = 0; k < p.count; k++) { const y = p.getY(k); p.setX(k, p.getX(k) * (1 - y * .9)); p.setZ(k, y * y * .15); } g.rotateY(b / 3 * Math.PI + rr(-.2, .2)); g.translate(rr(-.08, .08), 0, rr(-.08, .08)); blades.push(g.toNonIndexed()); }
  const base = mergeGeometries(blades);
  const cnt = base.attributes.position.count, colr = new Float32Array(cnt * 3), nrm = new Float32Array(cnt * 3);
  for (let k = 0; k < cnt; k++) { const y = base.attributes.position.getY(k); const c = new THREE.Color(0x2c3416).lerp(new THREE.Color(0x8a8d4a), y); colr[k * 3] = c.r; colr[k * 3 + 1] = c.g; colr[k * 3 + 2] = c.b; nrm[k * 3 + 1] = 1; }
  const ig = new THREE.InstancedBufferGeometry(); ig.setAttribute('position', base.attributes.position); ig.setAttribute('color', new THREE.BufferAttribute(colr, 3)); ig.setAttribute('normal', new THREE.BufferAttribute(nrm, 3)); ig.setAttribute('uv', base.attributes.uv);
  const R = 30, N = World.grassMax, off = new Float32Array(N * 4); const r = mulberry32(3);
  for (let i = 0; i < N; i++) { off[i * 4] = (r() * 2 - 1) * R; off[i * 4 + 1] = (r() * 2 - 1) * R; off[i * 4 + 2] = r(); off[i * 4 + 3] = r(); }
  ig.setAttribute('aOff', new THREE.InstancedBufferAttribute(off, 4)); ig.instanceCount = N;
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .9, side: THREE.DoubleSide });
  World.grassU = { uPlayer: { value: new THREE.Vector3() }, uR: { value: R }, uHeight: { value: World.heightTex }, uMask: { value: World.maskTex }, uTime: U.time };
  mat.onBeforeCompile = s => {
    Object.assign(s.uniforms, World.grassU);
    s.vertexShader = `attribute vec4 aOff; uniform vec3 uPlayer; uniform float uR, uTime; uniform sampler2D uHeight, uMask; varying float vGrassAO;
      float sampleH(vec2 wp){ vec2 g = (wp + 500.0) / 1000.0 * 255.0; vec2 i = floor(g); vec2 f = g - i;
        float a = texture2D(uHeight, (i + vec2(.5,.5)) / 256.0).r, b = texture2D(uHeight, (i + vec2(1.5,.5)) / 256.0).r;
        float c = texture2D(uHeight, (i + vec2(.5,1.5)) / 256.0).r, d = texture2D(uHeight, (i + vec2(1.5,1.5)) / 256.0).r;
        return mix(mix(a,b,f.x), mix(c,d,f.x), f.y); }
      ` + s.vertexShader
      .replace('#include <color_vertex>', `#include <color_vertex>
        vColor.rgb *= mix(vec3(.82,.9,.7), vec3(1.12,1.02,.78), aOff.z);`)
      .replace('#include <begin_vertex>', `
        vec2 rel = mod(aOff.xy - uPlayer.xz + uR, 2.0 * uR) - uR;
        vec2 wp = uPlayer.xz + rel;
        float mask = texture2D(uMask, (wp + 500.0) / 1000.0).r;
        float distF = 1.0 - smoothstep(uR * .65, uR, length(rel));
        float lawn = smoothstep(0.55, 0.95, mask);
        float vis = step(aOff.w, mask) * distF;
        float hgt = mix(0.6, 0.22, lawn) * (0.65 + aOff.z * 0.7);
        float ang = aOff.w * 43.98;
        vec3 p = position;
        p.xz = mat2(cos(ang), -sin(ang), sin(ang), cos(ang)) * p.xz;
        p.y *= hgt * vis; p.xz *= mix(0.6, 1.0, aOff.z) * vis;
        float bend = p.y * p.y;
        float w = sin(uTime * 1.7 + wp.x * .33 + wp.y * .21) * .5 + sin(uTime * 3.3 + wp.x * .9) * .15;
        p.x += w * .28 * bend; p.z += w * .14 * bend;
        vec2 away = wp - uPlayer.xz; float dp = length(away);
        p.xz += (away / max(dp, .001)) * (1.0 - smoothstep(0.0, 1.2, dp)) * .6 * bend;
        vec3 transformed = vec3(wp.x + p.x, sampleH(wp) + p.y - .02, wp.y + p.z);
        vGrassAO = clamp(position.y * 1.4 + .25, 0., 1.);`);
    s.fragmentShader = 'varying float vGrassAO;\n' + s.fragmentShader.replace('#include <color_fragment>', '#include <color_fragment>\n diffuseColor.rgb *= vGrassAO;');
  };
  const mesh = new THREE.Mesh(ig, mat); mesh.frustumCulled = false; mesh.receiveShadow = true; World.group.add(mesh);
  World.grass = mesh;
}
function buildAtmosphere() {
  // falling leaves around the camera
  const N = 260, pos = new Float32Array(N * 3), cols = new Float32Array(N * 3), seed = [];
  const pal = [0xc8742a, 0xa8421c, 0xd8b040, 0x8a2c1c].map(c => new THREE.Color(c));
  for (let i = 0; i < N; i++) { seed.push({ x: rr(-30, 30), y: rr(0, 18), z: rr(-30, 30), s: rr(.4, 1), p: rr(0, TAU) }); const c = pick(pal); cols[i * 3] = c.r; cols[i * 3 + 1] = c.g; cols[i * 3 + 2] = c.b; }
  const lt = canvasTex(32, 32, (g) => { g.fillStyle = '#fff'; g.beginPath(); g.ellipse(16, 16, 12, 6, .6, 0, TAU); g.fill(); }, { repeat: false });
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(cols, 3));
  const pts = new THREE.Points(g, new THREE.PointsMaterial({ size: .22, map: lt, vertexColors: true, transparent: true, alphaTest: .3 }));
  pts.frustumCulled = false; World.group.add(pts);
  World.updaters.push((dt, t) => {
    const c = camera.position;
    for (let i = 0; i < N; i++) { const s = seed[i]; s.y -= dt * (.6 + s.s * .6); s.x += Math.sin(t * 1.3 + s.p) * dt * .8 + dt * .4; s.z += Math.cos(t * .9 + s.p) * dt * .5;
      if (s.y < -2) { s.y = 16; s.x = rr(-30, 30); s.z = rr(-30, 30); }
      let wx = ((s.x - c.x) % 60 + 90) % 60 - 30, wz = ((s.z - c.z) % 60 + 90) % 60 - 30; pos[i * 3] = c.x + wx; pos[i * 3 + 1] = c.y - 4 + s.y; pos[i * 3 + 2] = c.z + wz; }
    g.attributes.position.needsUpdate = true;
  });
  // mist billboards in the woods and over the lake
  const mt = canvasTex(128, 128, (c, w, h) => { const img = c.createImageData(w, h); for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const dx = x / w - .5, dy = y / h - .5; const r = Math.sqrt(dx * dx + dy * dy) * 2; const n = fbm(x * .05, y * .05, 3) * .5 + .5; const a = Math.max(0, 1 - r) ** 1.6 * n; const k = (y * w + x) * 4; img.data[k] = img.data[k + 1] = img.data[k + 2] = 255; img.data[k + 3] = a * 255; } c.putImageData(img, 0, 0); }, { repeat: false });
  const mists = [];
  const mm = new THREE.SpriteMaterial({ map: mt, transparent: true, opacity: .0, depthWrite: false, color: 0xb8c4d0 });
  for (let i = 0; i < 70; i++) {
    let x, z; const k = rand();
    if (k < .35) { const a = rand() * TAU, r = rand() * LAKE.r; x = LAKE.x + Math.cos(a) * r; z = LAKE.z + Math.sin(a) * r; }
    else if (k < .55) { x = -40 + rr(-22, 22); z = -165 + rr(-22, 22); }
    else { x = rr(-160, 160); z = rr(-90, -260); }
    const s = new THREE.Sprite(mm); const y = Math.max(heightAt(x, z), LAKE.y) + rr(.6, 2.2); s.position.set(x, y, z); s.scale.set(rr(14, 26), rr(4, 7), 1); World.group.add(s); mists.push(s);
  }
  World.mistMat = mm;
  // flames
  const fg = new THREE.ConeGeometry(.035, .14, 6); fg.translate(0, .07, 0);
  const fl = new THREE.InstancedMesh(fg, MAT.flame, World.flames.length); const d = new THREE.Object3D();
  World.flames.forEach((p, i) => { d.position.copy(p); d.updateMatrix(); fl.setMatrixAt(i, d.matrix); }); fl.computeBoundingSphere(); World.group.add(fl);
  const fd = new THREE.Object3D();
  World.updaters.push((dt, t) => { World.flames.forEach((p, i) => { fd.position.copy(p); const f = 1 + Math.sin(t * 13 + i * 3.1) * .15 + Math.sin(t * 7.3 + i) * .1; fd.scale.set(1, f, 1); fd.rotation.z = Math.sin(t * 5 + i) * .1; fd.updateMatrix(); fl.setMatrixAt(i, fd.matrix); }); fl.instanceMatrix.needsUpdate = true; });
  // embers rising from the clearing
  const EN = 70, ep = new Float32Array(EN * 3), es = []; for (let i = 0; i < EN; i++) es.push(rand());
  const eg = new THREE.BufferGeometry(); eg.setAttribute('position', new THREE.BufferAttribute(ep, 3));
  const em = new THREE.Points(eg, new THREE.PointsMaterial({ size: .07, color: 0xff7a30, map: World.softDot, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  World.group.add(em); const by = heightAt(-40, -165);
  World.updaters.push((dt, t) => { for (let i = 0; i < EN; i++) { const ph = (t * .25 + es[i]) % 1; ep[i * 3] = -40 + Math.sin(es[i] * 50 + t) * (.3 + ph); ep[i * 3 + 1] = by + .3 + ph * 4; ep[i * 3 + 2] = -165 + Math.cos(es[i] * 70 + t * .8) * (.3 + ph); } eg.attributes.position.needsUpdate = true; });
}

/* ---------- light pool ---------- */
function buildLightPool() {
  for (let i = 0; i < 6; i++) { const l = new THREE.PointLight(0xffffff, 0, 20, 2); scene.add(l); World.lights.push(l); }
  World.spotGuard = new THREE.SpotLight(0xe8f0ff, 0, 32, .32, .5, 1.5); scene.add(World.spotGuard, World.spotGuard.target);
  World.spotCar = new THREE.SpotLight(0xfff2d8, 0, 60, .55, .6, 1.2); scene.add(World.spotCar, World.spotCar.target);
  World.spotPreview = new THREE.SpotLight(0xffe0bc, 0, 14, .42, .7, 1.4); World.spotPreview.position.set(-1.2, 3.6, 13.6); World.spotPreview.target.position.set(1.6, 1.0, 10.6); scene.add(World.spotPreview, World.spotPreview.target);
}
let lightPoolT = 0;
function updateLightPool(dt, t, focus) {
  lightPoolT -= dt;
  const night = TOD.night;
  if (lightPoolT <= 0) {
    lightPoolT = .25;
    const cand = [];
    for (const s of World.lightSources) { if (s.nightOnly && night < .25) continue; const d = s.pos.distanceToSquared(focus); if (d < 110 * 110) cand.push([d, s]); }
    cand.sort((a, b) => a[0] - b[0]);
    World.lights.forEach((l, i) => { const c = cand[i]; l.userData.src = c ? c[1] : null; if (c) { l.position.copy(c[1].pos); l.color.copy(c[1].color); l.distance = c[1].distance; } });
  }
  for (const l of World.lights) {
    const s = l.userData.src; if (!s) { l.intensity = damp(l.intensity, 0, 8, dt); continue; }
    const k = s.nightOnly ? smooth(.25, .7, night) : 1;
    const fl = s.flicker ? 1 - s.flicker * (Math.sin(t * 17 + s.pos.x) * .5 + .5) * Math.random() : 1;
    l.intensity = damp(l.intensity, s.intensity * k * fl, 10, dt);
  }
}
World.setNight = function (n, golden) {
  const lit = lerp(.15, 1.5, n) + golden * .25;
  MAT.winLit.emissiveIntensity = lit; MAT.winLit2.emissiveIntensity = lit * .9; MAT.archLit.emissiveIntensity = lit;
  MAT.lampGlass.emissiveIntensity = lerp(.3, 2.4, smooth(.2, .7, n));
  MAT.stainedIn.emissiveIntensity = lerp(1.4, .55, n); MAT.stainedOut.emissiveIntensity = lerp(.15, 1.6, n);
  MAT.roseIn.emissiveIntensity = lerp(1.4, .55, n); MAT.roseOut.emissiveIntensity = lerp(.15, 1.6, n);
  MAT.clock.emissiveIntensity = n * 1.1;
  if (World.mistMat) World.mistMat.opacity = lerp(.05, .2, n);
  for (const f of World.nightFns) f(n);
};
World.update = function (dt, t, focus) {
  U.time.value = t;
  TEX.water.offset.set(t * .012, t * .007);
  if (World.grassU) World.grassU.uPlayer.value.copy(focus);
  for (const f of World.updaters) f(dt, t);
  // clock hands follow game time
  const h = TOD.hour % 12, m = (TOD.hour % 1) * 60;
  for (const c of World.clockHands) c.inner.rotation.z = -(c.k === 'h' ? h / 12 : m / 60) * TAU;
  updateLightPool(dt, t, focus);
  if (World.treeChunks) for (const m of World.treeChunks) { const c = m.boundingSphere.center; m.visible = Math.hypot(c.x - camera.position.x, c.z - camera.position.z) - m.boundingSphere.radius < 420; }
  stars.position.copy(camera.position); moon.position.copy(camera.position).addScaledVector(TOD.moonDir, 1600); nightDome.position.copy(camera.position);
};
function buildWorld(progress) {
  World.extraTrees = []; World.flames = [];
  buildMaterials();
  const B = new Batch();
  const steps = [
    ['Raising the terrain', () => buildTerrain()],
    ['Laying roads and paths', () => buildGround()],
    ['Building the main hall', () => buildHall(B)],
    ['Building the chapel', () => buildChapel(B)],
    ['Building the gymnasium', () => buildGym(B)],
    ['Opening the diner', () => { buildDiner(B); buildGas(B); buildHouses(B); }],
    ['Lining the field', () => { buildField(B); buildWaterTower(B); }],
    ['Down to the lake', () => { buildBoathouse(B); buildClearing(B); }],
    ['The quad', () => { buildFountain(B); buildStatue(B); buildFlag(); buildMisc(B); }],
    ['Merging geometry', () => B.flush(World.group)],
    ['Planting the woods', () => buildTrees()],
    ['Growing grass', () => buildGrass()],
    ['Mist', () => { buildAtmosphere(); buildLightPool(); }]
  ];
  return steps.map(([label, fn], i) => ({ label, fn, p: (i + 1) / steps.length }));
}
