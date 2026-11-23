
/* ============================== cars ============================== */
function spawnCars() {
  const stall = k => -67 + 1.72 + 3.38 * (k + .5);
  const cols = [0x2a3a52, 0xb8b4aa, 0x1e1f22, 0x4a5a3a, 0x7a6a50, 0x8a8f96, 0x3a2a3a, 0x6a1e1a];
  [1, 3, 8, 10].forEach((k, i) => new Car(cols[i], stall(k), 60.2, 0));
  [2, 5, 9].forEach((k, i) => new Car(cols[i + 4], stall(k), 79.8, Math.PI));
  const st = new Car(0x5c1418, stall(6), 60.2, 0, { name: 'Steven' }); void st;
  new Car(0x2e4a5a, -146, 151, Math.PI / 2); new Car(0xc8c2b0, -114, 160, 0);
  new Car(0x3a3c40, -210, 126, Math.PI / 2); new Car(0x5a3020, -268, 152, -Math.PI / 2);
  const a1 = new Car(0x9a8a6a, -200, 142.3, Math.PI / 2, { ai: { dir: 1, cruise: 12 } }); a1.speed = 12;
  const a2 = new Car(0x2a2a30, 120, 137.7, -Math.PI / 2, { ai: { dir: -1, cruise: 11 } }); a2.speed = 11;
  const a3 = new Car(0x6a7a8a, -60, 137.7, -Math.PI / 2, { ai: { dir: -1, cruise: 13 } }); a3.speed = 13;
}

/* ============================== screens ============================== */
function openPanel(id) { $$('.panel-screen').forEach(p => p.hidden = true); if (id) $(id).hidden = false; Game.panel = id; AudioFX.ui(); }
$$('[data-close]').forEach(b => b.addEventListener('click', () => closePanel()));
function closePanel() {
  const was = Game.panel; $$('.panel-screen').forEach(p => p.hidden = true); Game.panel = null;
  if (Game.state === 'pause' && Game.fromPlay) { Game.fromPlay = false; resume(); }
  else if (Game.state === 'pause' && was !== '#scr-pause') openPanel('#scr-pause');
  else if (Game.state === 'pause' && was === '#scr-pause') resume();
}
function pause() { if (Game.state !== 'play') return; Game.state = 'pause'; Input.pressed = {}; Game.fromPlay = false; if (document.pointerLockElement) document.exitPointerLock(); openPanel('#scr-pause'); menuSel.pause = 0; highlightList('#pause-list', 0); AudioFX.setEngine(false); }
function resume() { $$('.panel-screen').forEach(p => p.hidden = true); Game.panel = null; Game.state = 'play'; if (!isTouch) { const r = canvas.requestPointerLock && canvas.requestPointerLock(); if (r && r.catch) r.catch(() => { }); } }
document.addEventListener('pointerlockchange', () => { if (!document.pointerLockElement && Game.state === 'play' && !Game.talking && !Game.busy && !Game.photo && !Game.panel && !Game.ignoreUnlock) pause(); Game.ignoreUnlock = false; });
const menuSel = { menu: 1, pause: 0 };
function highlightList(sel, i) { const b = [...$(sel).children]; b.forEach((x, k) => x.classList.toggle('sel', k === i)); }
function listNav(sel, key) {
  const items = [...$(sel).children]; let i = menuSel[key];
  if (Input.hit('ArrowDown') || Input.hit('KeyS')) { do { i = (i + 1) % items.length; } while (items[i].disabled); AudioFX.ui(); }
  if (Input.hit('ArrowUp') || Input.hit('KeyW')) { do { i = (i + items.length - 1) % items.length; } while (items[i].disabled); AudioFX.ui(); }
  menuSel[key] = i; highlightList(sel, i);
  if (Input.hit('Enter') || Input.hit('Space')) items[i].click();
}
// pause actions
$('#pause-list').addEventListener('click', e => {
  const a = e.target.closest('button')?.dataset.act; if (!a) return; AudioFX.uiConfirm();
  if (a === 'resume') resume();
  if (a === 'journal') { buildJournal(); openPanel('#scr-journal'); }
  if (a === 'map') { drawFullMap(); openPanel('#scr-map'); }
  if (a === 'options') { buildOptions(); openPanel('#scr-options'); }
  if (a === 'controls') openPanel('#scr-controls');
  if (a === 'title') { Missions.save(); toTitle(); }
});
$$('#pause-list button').forEach((b, i) => b.addEventListener('mouseenter', () => { menuSel.pause = i; highlightList('#pause-list', i); }));
function buildJournal() {
  const list = Missions.list();
  $('#j-who').textContent = Game.role === 'custom' ? `${playerName()} · Transfer student` : `${ROLES[Game.role].name} · ${ROLES[Game.role].k}`;
  $('#j-list').innerHTML = list.map((m, i) => { const done = i < Game.mi || (Game.free), cur = i === Game.mi && !Game.free; return `<li class="${done ? 'done' : cur ? 'cur' : 'locked'}"><span class="n">${ROMAN[i]}</span><span class="t">${cur || done ? m.title : 'Locked'}<small>${cur || done ? m.blurb : 'Keep playing.'}</small></span><span class="s">${done ? 'Complete' : cur ? 'Current' : ''}</span></li>`; }).join('');
  $('#j-ties').innerHTML = (TIE_KEYS[Game.role] || []).map(k => { const v = Game.rel[k] || 0; const word = v >= 2 ? 'Close' : v >= 1 ? 'Warm' : v <= -2 ? 'Broken' : v <= -1 ? 'Strained' : 'Uncertain'; return `<div class="tie"><span>${word}</span><b>${TIE_NAMES[k]}</b><div class="bar"><i style="width:${(v + 3) / 6 * 100}%"></i></div></div>`; }).join('');
}
function buildOptions() {
  const q = $('#o-quality'); q.innerHTML = '';
  for (const [k, v] of Object.entries(QUALITY)) { const b = document.createElement('button'); b.textContent = v.label; b.classList.toggle('on', settings.quality === k); b.addEventListener('click', () => { settings.quality = k; saveSettings(); applyQuality(); buildOptions(); }); q.appendChild(b); }
  $('#o-sens').value = settings.sens; $('#o-fov').value = settings.fov; $('#o-vol').value = AudioFX.vol; $('#o-invert').checked = settings.invert; $('#o-grain').checked = settings.grain;
}
function saveSettings() { store.set('settings', settings); }
$('#o-sens').addEventListener('input', e => { settings.sens = +e.target.value; saveSettings(); });
$('#o-fov').addEventListener('input', e => { settings.fov = +e.target.value; saveSettings(); });
$('#o-vol').addEventListener('input', e => AudioFX.setVol(+e.target.value));
$('#o-invert').addEventListener('change', e => { settings.invert = e.target.checked; saveSettings(); });
$('#o-grain').addEventListener('change', e => { settings.grain = e.target.checked; saveSettings(); });

/* ============================== intro ============================== */
let introSkip = false;
const introLine = async (html, ms) => { if (introSkip) return; const el = $('#intro-line'); el.innerHTML = html; el.classList.add('on'); await waitSkippable(ms); el.classList.remove('on'); await waitSkippable(1300); };
const waitSkippable = async ms => { const end = performance.now() + ms; while (performance.now() < end) { if (introSkip) return; await wait(50); } };
const Shot = { from: null, to: null, lookFrom: null, lookTo: null, t: 0, dur: 1, active: false };
function shot(from, to, lookFrom, lookTo, dur) { Object.assign(Shot, { from: new THREE.Vector3(...from), to: new THREE.Vector3(...to), lookFrom: new THREE.Vector3(...lookFrom), lookTo: new THREE.Vector3(...lookTo), t: 0, dur, active: true }); camOverride(Shot.from, Shot.lookFrom, 50, true); }
function updateShot(dt) {
  if (!Shot.active) return; Shot.t = Math.min(1, Shot.t + dt / Shot.dur); const e = Shot.t * Shot.t * (3 - 2 * Shot.t) * .5 + Shot.t * .5;
  Cam.override.pos.lerpVectors(Shot.from, Shot.to, e); Cam.override.look.lerpVectors(Shot.lookFrom, Shot.lookTo, e); Cam.override.speed = 50;
  if (gradePass.uniforms.uCam.value > 0) { Cam.override.pos.x += Math.sin(performance.now() / 300) * .03; Cam.override.pos.y += Math.sin(performance.now() / 420) * .03; }
}
async function playIntro() {
  Game.state = 'intro'; introSkip = false; showScreen('#scr-intro'); $('#title-card').hidden = true; $('#cam-osd').hidden = true;
  AudioFX.setAmbience({ wind: .25, drone: 1, shimmer: .02 });
  await fadeOut(10);
  await introLine('<small>Fairhaven · October 2004</small>St. Agatha\'s Catholic High School.', 3600);
  // shot 1: found footage dolly into the clearing
  if (!introSkip) {
    setHour(23.75); defaultCast(); for (const n of NPCList) n.setVisible(false);
    const gh = NPCS.ghost; gh.ghost = true; gh.place(-40, -171.5, 0); gh.setVisible(true); gh.hidden = true;
    shot([-29, 1.9, -144], [-36.4, 1.55, -157.2], [-38, 1.2, -160], [-40, 1.0, -165.5], 15);
    gradePass.uniforms.uCam.value = 1; $('#cam-osd').hidden = false; fadeIn(1600);
    let tc = 0; const tci = setInterval(() => { tc++; $('#cam-tc').textContent = `OCT.14.2004 11:${String(52 + Math.floor(tc / 60)).padStart(2, '0')}:${String(tc % 60).padStart(2, '0')} PM`; }, 1000);
    await introLine('Every fall, the Lions take the new girls into the woods.', 3800);
    await introLine('Candles. An oath. A secret you keep forever.', 3600);
    gh.hidden = false; AudioFX.whisper(2.5, .14); await waitSkippable(450); gh.hidden = true; await waitSkippable(300); gh.hidden = false; await waitSkippable(200); gh.setVisible(false);
    clearInterval(tci);
    await fadeOut(160);
  }
  // shot 2: crane over the tree line to the school
  if (!introSkip) {
    gradePass.uniforms.uCam.value = 0; $('#cam-osd').hidden = true;
    shot([-10, 6, -118], [6, 46, -132], [-4, 10, -80], [0, 22, -36], 13);
    fadeIn(1800);
    await introLine('This year, twelve girls lit the candles.', 3800);
    await introLine('Thirteen walked out.', 3400);
    await fadeOut(900);
  }
  // shot 3: the quad, someone at the fountain
  if (!introSkip) {
    const gh = NPCS.ghost; gh.place(0, 6.6, Math.PI); gh.setVisible(true); gh.hidden = false; gh.ghost = true;
    shot([1.5, 1.5, 20], [.6, 1.6, 11.5], [0, 1.4, 6], [0, 1.45, 6.6], 9);
    fadeIn(1400); AudioFX.setAmbience({ wind: .2, drone: 1.4, shimmer: .05 });
    await waitSkippable(5200);
    if (!introSkip) { gh.forceYaw = 0; Vision.target = .7; AudioFX.whisper(1.5, .2); await waitSkippable(1300); }
    if (!introSkip) { AudioFX.tone(36, 2, { gain: .9, freqEnd: 20 }); gradePass.uniforms.uFlash.value = 1; await wait(80); gradePass.uniforms.uFlash.value = 0; }
    gh.forceYaw = null; gh.setVisible(false); Vision.target = 0;
    await fadeOut(60);
  }
  Shot.active = false; Vision.target = 0; gradePass.uniforms.uCam.value = 0; $('#cam-osd').hidden = true; $('#intro-line').classList.remove('on');
  // title
  $('#btn-skip').hidden = true; $('#title-card').hidden = false;
  AudioFX.tone(55, 6, { gain: .3, verb: .9, attack: 1 }); AudioFX.tone(82.4, 6, { gain: .12, verb: .9, attack: 1.5 });
  introSkip = false; await waitSkippable(5600);
  toMenu();
}

/* ============================== menu ============================== */
function menuScene() {
  setHour(23.6); defaultCast(); for (const n of NPCList) n.setVisible(false);
  const g = NPCS.menuGirl; g.place(-37.75, -160.75, -2.74); g.setVisible(true); g.forceYaw = -2.74;
  const gh = NPCS.ghost; gh.ghost = true; gh.place(-41.6, -169.7, .4); gh.setVisible(true); gh.hidden = false;
  shot([-37.6, 1.55, -158.4], [-37.3, 1.6, -158.0], [-40.9, 1.15, -167.5], [-41.1, 1.2, -167.8], 60);
}
function toMenu() {
  Game.state = 'menu'; World.spotPreview.intensity = 0; showScreen('#scr-menu'); $('#hud').hidden = true; $('#touch').hidden = true; letterbox(false);
  menuScene(); fadeIn(1500);
  AudioFX.setAmbience({ wind: .3, crickets: .4, drone: .7, shimmer: .03 });
  const sv = store.get('save', null);
  const cont = $('#menu-list [data-act="continue"]'); cont.disabled = !sv;
  $('#menu-cont').innerHTML = sv ? `Last played as <b>${sv.role === 'custom' ? (sv.custom?.name || 'You') : ROLES[sv.role].name}</b><br>${sv.free ? 'Free roam' : `Chapter ${ROMAN[sv.mi] || 'IV'} · ${(MISSIONS[sv.role][sv.mi] || {}).title || ''}`}` : '';
  menuSel.menu = sv ? 0 : 1; highlightList('#menu-list', menuSel.menu);
}
$('#menu-list').addEventListener('click', e => {
  const b = e.target.closest('button'); if (!b || b.disabled) return; const a = b.dataset.act; AudioFX.uiConfirm();
  if (a === 'continue') continueGame();
  if (a === 'new') toSelect();
  if (a === 'options') { buildOptions(); openPanel('#scr-options'); }
  if (a === 'controls') openPanel('#scr-controls');
  if (a === 'credits') openPanel('#scr-credits');
});
$$('#menu-list button').forEach((b, i) => b.addEventListener('mouseenter', () => { if (b.disabled) return; menuSel.menu = i; highlightList('#menu-list', i); AudioFX.ui(); }));
async function toTitle() {
  $$('.panel-screen').forEach(p => p.hidden = true); Game.panel = null; Game.state = 'menu';
  if (Player.car) exitCar(true); if (Game.photo) togglePhoto(false);
  await fadeOut(600); Missions.clearItems(); Game.obj = null; Game.mission = null; if (Player.char) Player.char.root.visible = false; beacon.visible = false; $('#obj-marker').style.opacity = 0;
  World.spotGuard.intensity = 0; Guard.active = false; AudioFX.setEngine(false);
  toMenu();
}

/* ============================== character select ============================== */
let selRole = 'anya', preview = null;
const SEL_ORDER = ['anya', 'elise', 'steven', 'custom'];
function customSpec() { const c = Game.custom || defaultCustom(); if (c.look === 'photo' && ASSETS.models.photoreal) return { real: 'photoreal', fem: true, height: 1 }; return { fem: c.build === 'f', skin: c.skin, hair: c.hair, hairCol: c.hairCol, outfit: c.outfit, accent: c.accent, eye: '#3a2a1e', height: c.build === 'f' ? 1 : .98 }; }
function defaultCustom() { return { name: 'Sam Doyle', build: 'f', skin: SKINS[2], hair: 'bob', hairCol: HAIRS[2], outfit: 'hoodie', accent: ACCENTS[3] }; }
function specFor(role) { return role === 'custom' ? customSpec() : CAST[role].spec; }
function setPreview(spec) {
  if (preview) preview.dispose();
  preview = makeCharacter(spec); scene.add(preview.root); preview.root.position.set(1.6, 0, 10.6); preview.root.rotation.y = -.35; preview.mode = 'walk'; preview.speed = 0;
}
function selectScene() {
  setHour(18.35); defaultCast(); for (const n of NPCList) n.setVisible(false);
  ['marisol', 'bridget', 'nora', 'kevin', 'lauren'].forEach(k => NPCS[k].setVisible(true));
  World.spotPreview.intensity = 26; World.spotPreview.target.updateMatrixWorld();
  Shot.active = false;
  if (innerWidth < 720) camOverride(new THREE.Vector3(1.0, 1.5, 14.6), new THREE.Vector3(1.55, .55, 10.6), 3, true);
  else camOverride(new THREE.Vector3(-.35, 1.4, 13.7), new THREE.Vector3(.75, 1.08, 10.3), 3, true);
}
function toSelect() {
  Game.state = 'select'; showScreen('#scr-select'); selectScene();
  const cards = $('#sel-cards'); cards.innerHTML = '';
  SEL_ORDER.forEach((r, i) => { const b = document.createElement('button'); b.className = 'card'; b.dataset.role = r; b.innerHTML = `<span class="k">0${i + 1}</span><b>${r === 'custom' ? 'You' : ROLES[r].name}</b><span>${ROLES[r].k}</span>`; b.addEventListener('click', () => { pickRole(r); AudioFX.ui(); }); b.addEventListener('dblclick', () => $('#sel-go').click()); cards.appendChild(b); });
  pickRole(selRole);
}
function pickRole(r) {
  selRole = r; const R = ROLES[r];
  $$('#sel-cards .card').forEach(c => c.classList.toggle('sel', c.dataset.role === r));
  $('#sel-role').textContent = R.k; $('#sel-name').textContent = r === 'custom' ? 'Someone new' : R.name; $('#sel-desc').textContent = R.desc;
  $('#sel-ties').innerHTML = R.ties.map(([a, b]) => `<dt>${a}</dt><dd>${b}</dd>`).join('');
  $('#sel-go').textContent = r === 'custom' ? 'Create student' : `Play as ${R.name}`;
  setPreview(specFor(r));
}
$('#sel-back').addEventListener('click', () => { AudioFX.ui(); if (preview) { preview.dispose(); preview = null; } toMenu(); });
$('#sel-go').addEventListener('click', () => { AudioFX.uiConfirm(); if (selRole === 'custom') toCustom(); else newGame(selRole, null); });

/* ============================== customization ============================== */
function seg(el, opts, cur, cb) { el.innerHTML = ''; for (const [v, label] of opts) { const b = document.createElement('button'); b.textContent = label; b.classList.toggle('on', v === cur); b.addEventListener('click', () => { cb(v); AudioFX.ui(); }); el.appendChild(b); } }
function sw(el, cols, cur, cb) { el.innerHTML = ''; for (const c of cols) { const b = document.createElement('button'); b.style.background = c; b.title = c; b.setAttribute('aria-label', c); b.classList.toggle('on', c === cur); b.addEventListener('click', () => { cb(c); AudioFX.ui(); }); el.appendChild(b); } }
function buildCustomUI() {
  const c = Game.custom;
  seg($('#c-look'), [['stylized', 'Custom'], ['photo', 'Imported model']], c.look || 'stylized', v => { if (v === 'photo' && !ASSETS.ready) return; c.look = v; refreshCustom(); });
  $('#c-look').parentElement.hidden = !ASSETS.models.photoreal; if (!ASSETS.models.photoreal) c.look = 'stylized';
  $$('.cust-stylized').forEach(e => e.hidden = c.look === 'photo');
  seg($('#c-build'), [['f', 'Build A'], ['m', 'Build B']], c.build, v => { c.build = v; refreshCustom(); });
  sw($('#c-skin'), SKINS, c.skin, v => { c.skin = v; refreshCustom(); });
  seg($('#c-hair'), [['long', 'Long'], ['ponytail', 'Ponytail'], ['bob', 'Bob'], ['bun', 'Bun'], ['curly', 'Curls'], ['short', 'Short'], ['buzz', 'Buzz']], c.hair, v => { c.hair = v; refreshCustom(); });
  sw($('#c-haircol'), HAIRS, c.hairCol, v => { c.hairCol = v; refreshCustom(); });
  seg($('#c-outfit'), [['uniformF', 'Uniform · skirt'], ['uniformM', 'Uniform · trousers'], ['hoodie', 'Hoodie'], ['letterman', 'Letterman']], c.outfit, v => { c.outfit = v; refreshCustom(); });
  sw($('#c-accent'), ACCENTS, c.accent, v => { c.accent = v; refreshCustom(); });
  $('#c-name').value = c.name;
}
function refreshCustom() { buildCustomUI(); setPreview(customSpec()); }
function toCustom() {
  Game.state = 'custom'; showScreen('#scr-custom'); Game.custom = Game.custom || store.get('custom', null) || defaultCustom();
  if (innerWidth < 720) camOverride(new THREE.Vector3(1.2, 1.35, 13.4), new THREE.Vector3(1.6, 2.15, 10.6), 3);
  else camOverride(new THREE.Vector3(.1, 1.45, 13.2), new THREE.Vector3(1.0, 1.1, 10.4), 3);
  refreshCustom();
}
$('#c-name').addEventListener('input', e => { Game.custom.name = e.target.value.trim() || 'Sam Doyle'; });
$('#c-back').addEventListener('click', () => { AudioFX.ui(); toSelect(); });
$('#c-go').addEventListener('click', () => { AudioFX.uiConfirm(); store.set('custom', Game.custom); newGame('custom', Game.custom); });

/* ============================== start / continue ============================== */
async function beginPlay(role, custom) {
  Game.role = role; Game.custom = custom;
  if (preview) { preview.dispose(); preview = null; }
  setPlayerChar(specFor(role)); Player.char.root.visible = true;
  Shot.active = false; Cam.override = null;
  $$('.screen').forEach(s => s.hidden = true); $('#hud').hidden = false; $('#touch').hidden = !isTouch;
  Game.state = 'play'; AudioFX.setAmbience({ wind: .3, crickets: 0, drone: 0, shimmer: 0 });
  NPCS.menuGirl.setVisible(false); World.spotPreview.intensity = 0;
}
async function newGame(role, custom) {
  await fadeOut(700);
  Game.rel = role === 'anya' ? { steven: 1, elise: 1 } : role === 'elise' ? { anya: 1 } : role === 'steven' ? { anya: 1 } : {};
  Game.flags = {}; Game.mi = 0; Game.oi = 0; Game.free = false;
  await beginPlay(role, custom);
  Missions.start(0, 0, { noFade: true });
  if (!isTouch) setTimeout(() => toast('Click to look around. Esc pauses.'), 6000);
}
async function continueGame() {
  const sv = store.get('save', null); if (!sv) return;
  await fadeOut(700);
  Game.rel = sv.rel || {}; Game.flags = sv.flags || {};
  await beginPlay(sv.role, sv.custom);
  if (sv.free || sv.mi >= MISSIONS[sv.role].length) { startFree(sv.hour || 17); }
  else Missions.start(sv.mi, sv.oi || 0, { noFade: true });
}
async function startFree(hour = 17) {
  Game.free = true; Game.mission = null; Game.obj = null; defaultCast(); if (Game.role !== 'custom') NPCS[Game.role].setVisible(false);
  setHour(hour); placePlayer(0, 30, Math.PI); Missions.updateHud(); Missions.save(); await fadeIn(900);
}
function showEnding(role, key) {
  const e = ENDINGS[role][key]; if (!e) return;
  Game.state = 'ending'; if (document.pointerLockElement) document.exitPointerLock();
  AudioFX.success(); AudioFX.setAmbience({ wind: .2, drone: .8, shimmer: .06 });
  $('#end-k').textContent = `${role === 'custom' ? playerName() : ROLES[role].name} · Ending`; $('#end-t').textContent = e[0]; $('#end-s').textContent = e[1]();
  $('#scr-end').hidden = false; $('#hud').hidden = true;
  Game.free = true; Game.mi = MISSIONS[role].length; Missions.save();
  const done = store.get('endings', {}); done[role + ':' + key] = true; store.set('endings', done);
}
$('#end-again').addEventListener('click', async () => { $('#scr-end').hidden = true; AudioFX.uiConfirm(); await fadeOut(600); if (Player.char) Player.char.root.visible = false; Game.state = 'menu'; Game.free = false; toSelect(); fadeIn(800); });
$('#end-free').addEventListener('click', async () => { $('#scr-end').hidden = true; AudioFX.uiConfirm(); $('#hud').hidden = false; Game.state = 'play'; await fadeOut(500); startFree(TOD.hour); });

/* ============================== main loop ============================== */
const clock = new THREE.Clock();
let elapsed = 0, lastHourInt = -1, ambT = 0;
function loop() {
  requestAnimationFrame(loop);
  const dt = Math.min(.05, clock.getDelta()); elapsed += dt;
  const st = Game.state;
  if (st === 'boot') { Input.endFrame(); return; }
  // global keys
  if (st === 'intro' && (Input.hit('Space') || Input.hit('Escape') || Input.hit('Enter'))) introSkip = true;
  if (st === 'menu' && !Game.panel) listNav('#menu-list', 'menu');
  if (Game.panel && (Input.hit('Escape') || (Game.panel === '#scr-map' && Input.hit('KeyM')) || (Game.panel === '#scr-journal' && Input.hit('KeyJ')))) closePanel();
  else if (st === 'pause' && Game.panel === '#scr-pause') { listNav('#pause-list', 'pause'); if (Input.hit('KeyP')) resume(); }
  if (st === 'select') { const i = SEL_ORDER.indexOf(selRole); if (Input.hit('ArrowRight') || Input.hit('KeyD')) { pickRole(SEL_ORDER[(i + 1) % 4]); AudioFX.ui(); } if (Input.hit('ArrowLeft') || Input.hit('KeyA')) { pickRole(SEL_ORDER[(i + 3) % 4]); AudioFX.ui(); } if (Input.hit('Enter')) $('#sel-go').click(); if (Input.hit('Escape')) $('#sel-back').click(); }
  if (st === 'play') {
    if (Game.talking) dlgKeys();
    else if (!Game.busy) {
      if (Input.hit('Escape') || Input.hit('KeyP')) { pause(); }
      else if (Input.hit('KeyM')) { drawFullMap(); Game.state = 'pause'; Game.fromPlay = true; Game.ignoreUnlock = true; if (document.pointerLockElement) document.exitPointerLock(); openPanel('#scr-map'); }
      else if (Input.hit('KeyJ')) { buildJournal(); Game.state = 'pause'; Game.fromPlay = true; Game.ignoreUnlock = true; if (document.pointerLockElement) document.exitPointerLock(); openPanel('#scr-journal'); }
      else if (Input.hit('KeyC')) togglePhoto();
      else if (Game.photo) photoUpdate();
      else {
        const t = findInteract();
        if ((t && t.key === 'E' && Input.hit('KeyE')) || (t && t.key === 'F' && Input.hit('KeyF'))) doInteract(t);
      }
    }
    // time flows slowly while you play
    if (!Game.busy && !Game.talking) TOD.hour = (TOD.hour + dt / 120) % 24;
    updatePlayer(dt);
    for (const n of NPCList) n.update(dt);
    for (const v of World.vehicles) if (v.ai) v.aiUpdate(dt);
    guardUpdate(dt); Missions.update(dt);
    updateCamera(dt);
    // HUD
    const pr = $('#prompt'); const t = focusTarget;
    if (t && !Game.talking && !Game.busy && !Game.photo) { pr.hidden = false; $('#prompt-key').textContent = t.key; $('#prompt-text').textContent = t.label; } else pr.hidden = true;
    const np = $('#nameplate');
    if (t && t.kind === 'npc' && !Game.talking) { const n = t.npc; _mv.set(n.pos.x, (n.sit ? n.seatY + 1.45 : n.pos.y + 2.05), n.pos.z).project(camera); np.style.left = (_mv.x * .5 + .5) * innerWidth + 'px'; np.style.top = (-_mv.y * .5 + .5) * innerHeight + 'px'; np.innerHTML = `${n.name}<small>${n.role}</small>`; np.style.opacity = 1; } else np.style.opacity = 0;
    $('#hud-time').textContent = fmtTime(TOD.hour);
    updateStars(); updateHudHint();
    if (Math.floor(elapsed * 10) % 2 === 0) drawMinimap();
    if (Game.obj && Game.obj.type === 'course') Missions.updateHud();
    const hi = Math.floor(TOD.hour); if (hi !== lastHourInt) { if (lastHourInt >= 0 && Math.hypot(Player.pos.x, Player.pos.z + 36) < 260) AudioFX.bell(Math.min(3, hi % 12 || 12)); lastHourInt = hi; }
  } else if (st === 'pause' || st === 'ending') {
    // frozen world, keep rendering
  } else {
    for (const n of NPCList) if (n.visible) n.update(dt);
    for (const v of World.vehicles) if (v.ai) v.aiUpdate(dt);
    updateShot(dt); updateCamera(dt);
    if (preview) { preview.update(dt); preview.root.rotation.y = -.35 + Math.sin(elapsed * .3) * .25; }
  }
  updateMarkers(elapsed);
  visionUpdate(dt, elapsed);
  // ambience
  ambT -= dt; if (ambT <= 0 && st !== 'boot') { ambT = 1.5; const inside = Player.inside && st === 'play'; AudioFX.setAmbience({ wind: inside ? .06 : (st === 'play' ? .32 : .25) + (Player.pos.z < -72 ? .15 : 0), crickets: inside ? 0 : TOD.night * (st === 'play' ? .9 : .5), drone: st === 'menu' || st === 'select' || st === 'custom' ? .6 : (Vision.hyst * 2), shimmer: st === 'menu' ? .03 : 0 }); }
  updateSky(false);
  // shadow camera follows the focus, snapped to texels to avoid shimmer
  const focus = st === 'play' || st === 'pause' ? Player.pos : Cam.look;
  const dir = sunLight.userData.dir || TOD.sunDir;
  const q = QUALITY[settings.quality]; const texel = (SH * 2) / (q.shadow || 1024);
  const fx = Math.round(focus.x / texel) * texel, fz = Math.round(focus.z / texel) * texel;
  sunLight.target.position.set(fx, focus.y, fz); sunLight.position.set(fx + dir.x * 250, focus.y + dir.y * 250, fz + dir.z * 250);
  sunLight.target.updateMatrixWorld();
  World.update(dt, elapsed, focus);
  gradePass.uniforms.uTime.value = elapsed; gradePass.uniforms.uGrain.value = settings.grain ? .045 : 0;
  composer.render(dt);
  Input.endFrame();
}

/* ============================== boot ============================== */
async function boot() {
  const bar = $('#load-bar'), txt = $('#load-text');
  const step = async (label, p) => { txt.textContent = label; bar.style.width = (p * 100) + '%'; await new Promise(r => requestAnimationFrame(() => setTimeout(r, 0))); };
  try {
    await step('Painting textures', .02); buildTextures(renderer);
    buildComposer();
    const steps = buildWorld();
    for (const s of steps) { await step(s.label, .05 + s.p * .75); s.fn(); }
    await step('Waking the town', .84); spawnNPCs(); spawnCars(); buildAnomalies();
    await step('Drawing the map', .9); buildMap();
    applyQuality(); setHour(23.6);
    await step('Compiling shaders', .95);
    menuScene(); camera.position.copy(Cam.override.pos); camera.lookAt(Cam.override.look);
    renderer.compile(scene, camera);
    composer.render(.016);
    await step('Ready', 1);
    $('#btn-begin').disabled = false; $('#btn-begin').focus();
    // HD assets stream in after the game is playable; procedural versions stay as the fallback
    const foot = $('.menu-foot');
    loadAssets(p => { foot.textContent = `Loading HD textures and models · ${Math.round(p * 100)}%`; if (Game.state === 'custom') buildCustomUI(); })
      .then(ok => { foot.textContent = ok ? 'Unofficial fan project · HD assets loaded' : 'Unofficial fan project · HD assets unavailable'; if (Game.state === 'custom') buildCustomUI(); })
      .catch(e => { console.warn('asset load failed', e); foot.textContent = 'Unofficial fan project'; });
    window.__hysteria = { get focus() { return focusTarget; }, get preview() { return preview; }, enterCar, exitCar, Vision, Guard, Game, Missions, Player, NPCS, World, TOD, setHour, placePlayer, Input, Cam, settings, applyQuality, showEnding, startFree, togglePhoto };
  } catch (err) {
    console.error(err); txt.textContent = 'Something went wrong while building the world. Try reloading, or lower graphics in a newer browser.';
  }
}
$('#btn-begin').addEventListener('click', () => {
  AudioFX.init(); AudioFX.uiConfirm();
  $('#scr-boot').hidden = true;
  playIntro();
});
$('#btn-skip').addEventListener('click', () => { introSkip = true; });
addEventListener('keydown', e => { if (Game.state === 'boot' && e.code === 'Enter' && !$('#btn-begin').disabled) $('#btn-begin').click(); });
document.addEventListener('visibilitychange', () => { if (document.hidden && Game.state === 'play') pause(); });
if (!renderer.capabilities.isWebGL2) { $('#load-text').textContent = 'This game needs WebGL 2. Try a current version of Chrome, Edge, Firefox or Safari.'; }
else { boot(); requestAnimationFrame(loop); }
