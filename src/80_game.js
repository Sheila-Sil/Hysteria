
/* ============================== game state ============================== */
const Game = {
  state: 'boot', role: null, custom: null, mi: 0, oi: 0, mission: null, obj: null, rel: {}, flags: {}, talking: false, uiBlock: false, busy: false, free: false, photo: false, collected: 0, snapped: new Set(),
  onEvent(name, data) { Missions.event(name, data); }
};
const ROLES = {
  anya: { k: 'Captain of the Lions', name: 'Anya', desc: 'Captain of the Lions. Dating Steven. Keeping a secret that has nothing to do with the woods and everything to do with Elise.', ties: [['Elise', "It's complicated"], ['Steven', 'Boyfriend'], ['The Lions', 'Her team, her problem']] },
  elise: { k: 'Lions dancer', name: 'Elise', desc: "The best dancer on the team and the only one who won't pretend nothing happened. Everyone thinks she's faking. She knows what she saw.", ties: [['Anya', "It's complicated"], ['Steven', "Anya's boyfriend"], ['The Lions', 'Watching her']] },
  steven: { k: 'Varsity · #12', name: 'Steven', desc: 'Easygoing, liked by everyone, and the last person at St. Agatha\'s to notice his girlfriend has been slipping away from him all fall.', ties: [['Anya', 'Girlfriend'], ['Elise', "Anya's closest friend"], ['Ruth', 'Wants a quote']] },
  custom: { k: 'Transfer student', name: 'Someone new', desc: 'New to St. Agatha\'s, new to Fairhaven, and handed a camcorder by the school paper on day three. Nobody here has a reason to lie to you yet.', ties: [['Ruth', 'Your editor'], ['The Lions', 'Your story'], ['Mr. Pruitt', 'Avoid after ten']] }
};
const TIE_KEYS = { anya: ['elise', 'steven', 'lions'], elise: ['anya', 'lions', 'steven'], steven: ['anya', 'elise', 'ruth'], custom: ['ruth', 'anya', 'elise', 'steven'] };
const TIE_NAMES = { anya: 'Anya', elise: 'Elise', steven: 'Steven', lions: 'The Lions', ruth: 'Ruth' };
const playerName = () => Game.role === 'custom' ? (Game.custom?.name || 'You') : ROLES[Game.role]?.name || 'You';

/* ============================== UI helpers ============================== */
function toast(text, cls = '') { const el = document.createElement('div'); el.className = 'toast ' + cls; el.textContent = text; $('#toasts').appendChild(el); setTimeout(() => el.remove(), 4300); while ($('#toasts').children.length > 3) $('#toasts').firstChild.remove(); }
function fadeOut(ms = 800) { const f = $('#fade'); f.style.transitionDuration = ms + 'ms'; f.classList.remove('clear'); return wait(ms); }
function fadeIn(ms = 800) { const f = $('#fade'); f.style.transitionDuration = ms + 'ms'; f.classList.add('clear'); return wait(ms); }
function letterbox(on) { $('#letterbox').classList.toggle('on', on); }
function banner(k, t, s, done = false) { const b = $('#banner'); $('#b-k').textContent = k; $('#b-t').textContent = t; $('#b-s').textContent = s || ''; b.hidden = false; b.classList.remove('show'); b.classList.toggle('done', done); void b.offsetWidth; b.classList.add('show'); clearTimeout(banner._t); banner._t = setTimeout(() => { b.hidden = true; }, 5000); }
function showScreen(id) { for (const s of ['#scr-boot', '#scr-intro', '#scr-menu', '#scr-select', '#scr-custom']) $(s).hidden = s !== id; }
function adjustTie(k, d) {
  if (!d) return; Game.rel[k] = clamp((Game.rel[k] || 0) + d, -3, 3);
  if (TIE_KEYS[Game.role]?.includes(k)) toast(`${TIE_NAMES[k]} ${d > 0 ? 'will remember that.' : 'noticed.'}`, 'rel');
}

/* ============================== dialogue ============================== */
const Dlg = { resolve: null, typing: false, full: '', choiceResolve: null, sel: 0 };
function speakerName(id) { if (id === 'me') return playerName(); if (id === 'narr') return ''; return NPCS[id]?.name || CAST[id]?.name || id; }
function typeText(text) {
  const el = $('#dlg-text'); Dlg.full = text; Dlg.typing = true; el.innerHTML = '';
  return new Promise(res => {
    let i = 0; const step = () => { if (!Dlg.typing) { el.innerHTML = Dlg.full; res(); return; } i += 2; el.innerHTML = Dlg.full.slice(0, i); if (i % 6 === 0) AudioFX.tone(900 + Math.random() * 200, .02, { gain: .012, bus: 'ui' }); if (i >= Dlg.full.length) { Dlg.typing = false; el.innerHTML = Dlg.full; res(); } else setTimeout(step, 16); };
    step();
  });
}
function waitAdvance() { return new Promise(res => { Dlg.resolve = res; }); }
function dlgAdvance() { if (Dlg.choiceResolve) return; if (Dlg.typing) { Dlg.typing = false; return; } if (Dlg.resolve) { const r = Dlg.resolve; Dlg.resolve = null; AudioFX.ui(); r(); } }
$('#dlg-box').addEventListener('click', dlgAdvance);
function frameTalk(npc, speakerIsMe) {
  const a = Player.pos, b = npc.pos; const dx = b.x - a.x, dz = b.z - a.z, l = Math.hypot(dx, dz) || 1; const ux = dx / l, uz = dz / l, sx = -uz, sz = ux;
  const ay = a.y, by = npc.sit ? npc.seatY : b.y;
  if (!speakerIsMe) camOverride(new THREE.Vector3(a.x - ux * .9 + sx * .75, ay + 1.62, a.z - uz * .9 + sz * .75), new THREE.Vector3(b.x, by + (npc.sit ? 1.15 : 1.5), b.z), 4);
  else camOverride(new THREE.Vector3(b.x + ux * .9 + sx * .75, by + 1.62, b.z + uz * .9 + sz * .75), new THREE.Vector3(a.x, ay + 1.5, a.z), 4);
}
async function runDialogue(steps, npc) {
  Game.talking = true; Game.uiBlock = true; letterbox(true); $('#dlg').hidden = false; $('#prompt').hidden = true;
  if (document.pointerLockElement) document.exitPointerLock();
  if (npc) { npc.talking = true; npc.forceYaw = Math.atan2(Player.pos.x - npc.pos.x, Player.pos.z - npc.pos.z); Player.yaw = Math.atan2(npc.pos.x - Player.pos.x, npc.pos.z - Player.pos.z); if (Player.char) Player.char.root.rotation.y = Player.yaw; }
  const result = {};
  const run = async (list) => {
    for (const st of list) {
      if (Array.isArray(st)) {
        const [who, txt] = st; const name = speakerName(who);
        $('#dlg-name').textContent = name; $('#dlg-choices').innerHTML = ''; $('#dlg-next').hidden = false;
        if (npc) frameTalk(npc, who === 'me');
        const text = txt.replace(/\{name\}/g, playerName());
        await typeText(who === 'narr' ? `<i>${text}</i>` : text);
        await waitAdvance();
      } else if (st.choice) {
        $('#dlg-next').hidden = true; $('#dlg-name').textContent = playerName();
        if (npc) frameTalk(npc, false);
        const box = $('#dlg-choices'); box.innerHTML = '';
        const opts = st.choice;
        const picked = await new Promise(res => {
          Dlg.choiceResolve = res; Dlg.sel = 0;
          opts.forEach((o, i) => { const b = document.createElement('button'); b.innerHTML = `<b>${i + 1}</b><span>${o.t}</span>`; b.addEventListener('click', e => { e.stopPropagation(); res(i); }); box.appendChild(b); });
          box.children[0].classList.add('sel');
        });
        Dlg.choiceResolve = null; AudioFX.uiConfirm();
        const o = opts[picked]; box.innerHTML = '';
        if (o.rel) for (const [k, d] of Object.entries(o.rel)) adjustTie(k, d);
        if (o.flag) Game.flags[o.flag] = true;
        if (o.end) { Game.flags.ending = o.end; result.end = o.end; }
        if (o.then) await run(o.then);
      }
    }
  };
  await run(steps);
  $('#dlg').hidden = true; letterbox(false); camRelease();
  if (npc) { npc.talking = false; npc.forceYaw = null; }
  Game.talking = false; Game.uiBlock = false;
  return result;
}
function dlgKeys() {
  if (Dlg.choiceResolve) {
    const btns = $('#dlg-choices').children; const n = btns.length;
    for (let i = 0; i < n; i++) if (Input.hit('Digit' + (i + 1))) { Dlg.choiceResolve(i); return; }
    if (Input.hit('ArrowDown') || Input.hit('KeyS')) Dlg.sel = (Dlg.sel + 1) % n; if (Input.hit('ArrowUp') || Input.hit('KeyW')) Dlg.sel = (Dlg.sel + n - 1) % n;
    [...btns].forEach((b, i) => b.classList.toggle('sel', i === Dlg.sel));
    if (Input.hit('Enter') || Input.hit('Space') || Input.hit('KeyE')) Dlg.choiceResolve(Dlg.sel);
  } else if (Input.hit('Space') || Input.hit('Enter') || Input.hit('KeyE') || Input.hit('Mouse0')) dlgAdvance();
}

/* ============================== chatter (free roam) ============================== */
const CHAT = {
  anya: { elise: ['Not here, Elise. People are looking.', 'You were good today. In practice. I mean it.', "Please stop looking at the tree line like that. You're scaring the sophomores."], steven: ["Hey. I can't really talk right now.", "Dale's later? Maybe. I'll see.", "You don't have to walk me everywhere, Steven."], custom: ["You're the transfer with the camera. Point it somewhere else.", "If Ruth sent you, the answer is no comment.", "Welcome to St. Agatha's. Don't go in the woods. That's the whole orientation."] },
  elise: { anya: ['Hi, Captain.', "You can look at me, you know. It won't kill you.", "Ten o'clock. You know where."], steven: ["Steven. Hi. She's not with me, if that's what you're asking.", "You're a nice guy. That's honestly the worst part."], custom: ['People keep saying I faked it. Do I look like I faked it?', "If you're filming, get my good side. I don't have one this week."] },
  steven: { anya: ["There you are. You okay? You look like you didn't sleep.", "Friday's game, you'll be there? Halftime's yours anyway.", "I'm not mad. I just want to know what's going on."], elise: ["Hey, Elise. Is Anya mad at me? You'd tell me, right?", 'You guys are freaking everybody out. You know that?'], custom: ["New kid! You play anything? We need a kicker who isn't Danny.", "Herald, huh? Spell my name right."] },
  father: { any: ['The chapel is always open. I find most people come in when they think nobody will see them.', 'Fear makes liars of good people. Grief does the rest.', 'Mind the third pew. It creaks like it has opinions.'] },
  coach: { anya: ['Captain. Sleep tonight. That is an order.'], elise: ["Elise. If you need a week off, take a week off. Don't make me watch you fall again."], any: ["Practice is at four-thirty. I don't care what the town is saying.", 'Twelve girls, one routine. That is all I want this week.'] },
  ruth: { custom: ['Tape. Quotes. Truth. In that order.', "If anyone asks, the camcorder is for the yearbook."], any: ["The Herald doesn't print rumors. We print sources who have rumors.", "Funny how everybody on the team got the exact same stomach bug."] },
  dale: { any: ["Kitchen's open till two. Fries are always on.", 'Kids were in here till midnight Saturday. Wet shoes, all of them. Wouldn\'t say why.', "Sit anywhere. Not the corner booth. Don't ask."] },
  pruitt: { any: ['After ten, these grounds are closed. I mean that.', "Saw lights in the woods Saturday. Called it in. Nobody came."] },
  dancer: { anya: ["Captain. Are we still doing the halftime show?", "I keep hearing water. Do you hear water?", "Nora won't stop crying in the bathroom."], elise: ["Elise, did you really see her? Don't answer. I don't want to know.", "Coach says if you fall again you're off the team."], steven: ["Steven! Tell Anya we need her. She's not picking up.", "Hi Steven. Bye Steven."], custom: ["We're not allowed to talk to the Herald.", "Ask Anya. Everyone always asks Anya."] },
  student: { anya: ['Captain! Is it true about the woods?', 'Go Lions, I guess.', 'My mom says you guys should be tested for lead.'], elise: ["...That's her. She's the one who started it.", "Hey, are you okay? Like actually okay?", 'Witch. ...Sorry. Danny dared me.'], steven: ['Nice game Friday, twelve.', 'Dude. Your girlfriend is scary right now.', "Is Anya okay? She walked into a wall today."], custom: ["You're the new kid, right? Pick a side fast.", 'Herald? Nobody reads the Herald.', 'Rule one at St. Agatha\'s: the woods are off limits. Rule two: everyone goes anyway.'] }
};
function chatterFor(npc) {
  const r = Game.role; const id = npc.id;
  let pool = CHAT[id] ? (CHAT[id][r] || CHAT[id].any) : null;
  if (!pool && ['marisol', 'bridget', 'tasha', 'nora'].includes(id)) pool = CHAT.dancer[r];
  if (!pool) pool = CHAT.student[r];
  const line = pool[npc.lineIdx++ % pool.length];
  return [[id, line]];
}

/* ============================== missions ============================== */
const P = PLACES;
const SPOT = {
  gymCoach: [69, 1, -Math.PI / 2], gymMe: [61, 1, Math.PI / 2],
  dancers: [[59, -1.8], [59, 3.8], [57, -3.8], [57, 5.8], [57, 1]],
  boathouse: [43.6, -206.4, -Math.PI / 2], dockEnd: [61.5, -206],
  booth: [-146.9, 158.4, -Math.PI / 2], fatherAltar: [-72, 0, Math.PI / 2], chapelSteps: [-44, 1.4, Math.PI / 2], hallSteps: [3, -23.4, 0],
  quadAnya: [10, 4, -Math.PI / 2], parkSteven: [-40.5, 64.5, -.6], bleacherSit: [74, 57.85, 0]
};
const RIBBONS = [1, 4, 7].map(i => { const a = i / 9 * TAU + .2; return [-40 + Math.cos(a) * 8.2, -165 + Math.sin(a) * 8.2]; });
const GHOST_PATH = [[6, -12], [30, -27], [53, -30], [53, -60], [20, -62], [0, -64], [-4, -84], [-12, -104], [-24, -128], [-36, -150], [-40, -157]];
const COURSE = [[30, 70], [44, 100], [58, 70], [72, 100], [86, 70], [100, 100], [110, 85]];
function talkPlace(id) { return () => NPCS[id] ? { x: NPCS[id].pos.x, z: NPCS[id].pos.z, r: 2.6 } : null; }
const MISSIONS = {
  anya: [
    { title: 'Captain', blurb: 'Three days since the woods. The Lions still have a halftime show on Friday.', hour: 16.6, spawn: [-10, 18, Math.PI / 2],
      cast: N => { N.coach.place(...SPOT.gymCoach); N.nora.place(56, 8, Math.PI / 2); ['marisol', 'bridget', 'tasha'].forEach((k, i) => N[k].place(SPOT.dancers[i][0], SPOT.dancers[i][1], Math.PI / 2)); N.anya.setVisible(false); },
      obj: [
        { type: 'goto', place: () => P.gym_floor, text: 'Get to the gym. Practice started five minutes ago.' },
        { type: 'talk', npc: 'coach', text: 'Talk to Coach Reyes', dlg: [
          ['coach', 'Captain. Nice of you to join us.'], ['me', 'Sorry, Coach.'],
          ['coach', "Half your girls look like they haven't slept since the weekend. Nora threw up in the locker room. Bridget keeps shaking her hand like it fell asleep."],
          ['coach', "I don't want to know what you did out there. I want a routine. Can you give me a routine?"],
          { choice: [{ t: "We're fine. Run the music.", rel: { lions: 1 }, then: [['coach', "That's what I like to hear. From the top."]] }, { t: 'Something happened. Give us a minute.', rel: { lions: -1 }, flag: 'admitted', then: [['coach', 'You get one minute. Then you lead it like nothing happened. That is the job.']] }] }
        ] },
        { type: 'rhythm', diff: 1, text: 'Lead the routine' },
        { type: 'talk', npc: 'nora', text: 'Check on Nora', dlg: [
          ['nora', 'Did you see it? At the end. By the far wall.'], ['me', "There's nothing by the far wall, Nora."], ['nora', 'I know.'],
          ['nora', "She was standing where the candles were. Same jacket as us. She's following us, Anya."],
          { choice: [{ t: 'Nobody is following anybody. Go home and sleep.', rel: { lions: 1 }, then: [['nora', "...Okay. Okay. You're the captain."]] }, { t: 'What did she look like?', flag: 'askedNora', then: [['nora', "Like one of us. But wet. Like she'd just come up out of the lake."], ['narr', 'The gym lights buzz. Somewhere a door bangs shut and three girls flinch at once.']] }] }
        ] }
      ], end: 'The routine was clean. Nobody clapped.' },
    { title: 'Appearances', blurb: "Steven's waiting in the student lot. He always is.", hour: 17.4, spawn: [-30, 48, Math.PI],
      cast: N => { N.steven.place(...SPOT.parkSteven); N.anya.setVisible(false); },
      obj: [
        { type: 'talk', npc: 'steven', text: 'Meet Steven in the student lot', dlg: [
          ['steven', "There she is. You've been dodging me since Sunday."], ['me', "I've been busy."],
          ['steven', "With what? Your girls are fainting in the hallway and half the school thinks it's my fault somehow."],
          ['steven', "Let's go to Dale's. Fries, a booth, ten minutes where nobody's staring at us. I have to drop my gear at Marcus's first. Take my car, keys are in it. The maroon one."],
          { choice: [{ t: "Fine. I'll meet you there.", rel: { steven: 1 } }, { t: 'You really trust me with your car?', then: [['steven', "I trust you with everything. That's kind of the problem, right?"]] }] }
        ], after: () => NPCS.steven.placeLater(SPOT.booth[0], SPOT.booth[1], SPOT.booth[2], { sit: true, y: .06 }) },
        { type: 'goto', place: () => P.diner_lot, text: "Drive to Dale's Diner on Route 9" },
        { type: 'talk', npc: 'steven', text: 'Sit with Steven in the booth', dlg: [
          ['steven', 'Remember sophomore year? You ordered a chocolate shake and refused to drink it because Elise said it looked like pond water.'],
          ['narr', "He laughs. You don't remember Elise saying that. You remember her saying a lot of other things."],
          ['steven', 'Anya. Are we okay?'],
          { choice: [{ t: "We're fine.", rel: { steven: 1 }, flag: 'liedSteven', then: [['steven', "Okay. Good. That's good."], ['narr', 'He believes you. That is the worst part.']] }, { t: "I don't know.", rel: { steven: -1 }, then: [['steven', "...Right. Okay. I'll just sit with that, then."]] }, { t: 'Can we not do this here?', then: [['steven', "Sure. It's never a 'here' thing with you."]] }] }
        ] }
      ], end: 'Outside, the neon hums. Someone wrote LIARS in the dust on the back window of his car.' },
    { title: 'The Boathouse', blurb: 'Elise left a note in your locker. Two words. Boathouse, ten.', hour: 21.8, spawn: [-45, 92, Math.PI], dread: .05,
      cast: N => { N.elise.place(...SPOT.boathouse, { y: .7 }); N.anya.setVisible(false); },
      obj: [
        { type: 'goto', place: () => P.trailhead, text: 'Take the trail behind the main hall. Avoid Mr. Pruitt.' },
        { type: 'goto', place: () => P.boathouse, text: 'Find the boathouse by the lake' },
        { type: 'talk', npc: 'elise', text: 'Talk to Elise', dlg: [
          ['elise', 'You came.'], ['me', 'You said ten.'], ['elise', "I say a lot of things. You don't usually listen."],
          ['elise', 'I saw her again, Anya. Last night. Standing in my yard like she was waiting for me to come down.'],
          ['elise', "My mom thinks it's an eating thing. Father Franklin keeps saying 'trauma' like it's a prayer."],
          ['elise', "Tell me you see her too. Just tell me I'm not alone in this."],
          { choice: [{ t: 'I see her too.', rel: { elise: 2 }, flag: 'honestElise', then: [['elise', '...Thank you.'], ['narr', "She lets out a breath like she's been holding it since Saturday. Neither of you says anything for a while. The lake does the talking."]] },
            { t: 'We should stop meeting like this.', rel: { elise: -2 }, then: [['elise', 'Like what? Like people who actually care about each other?'], ['elise', 'Go home, Anya. Go home to Steven.']] },
            { t: "Steven can't find out about us.", rel: { elise: -1 }, then: [['elise', "Of course. That's always the part you're worried about."]] }] }
        ] },
        { type: 'vision', place: () => P.dock, ghostAt: () => SPOT.dockEnd, ghostY: .7, text: 'Something is standing at the end of the dock', after: 'When you look again, the dock is empty. The water around it is perfectly still.' }
      ], end: "When you looked back, the boathouse light was out. You don't remember it ever being on." },
    { title: 'The Clearing', blurb: 'Three ribbons are still tied in the clearing. Nobody went back to take them down.', hour: 23.4, spawn: [0, -66, Math.PI], dread: .1,
      cast: N => { N.father.place(...SPOT.fatherAltar); N.anya.setVisible(false); },
      obj: [
        { type: 'goto', place: () => P.clearing, text: 'Go back to the clearing' },
        { type: 'collect', items: RIBBONS, label: 'Untie the red ribbon', text: 'Untie the red ribbons' },
        { type: 'vision', place: () => P.clearing, text: 'Stand in the circle', after: 'Twelve candles. Thirteen shadows.' },
        { type: 'talk', npc: 'father', text: 'Go to the chapel. Father Franklin keeps it open late.', dlg: [
          ['father', "Anya. It's very late."], ['father', 'Whatever brought you here at this hour, you can set it down. God has heard worse. I promise you I have too.'],
          ['me', 'We went into the woods. It was supposed to be a game.'], ['father', "And now it isn't one."],
          ['father', 'The others will tell their versions. The parents will tell theirs. The newspaper will tell the worst one. What I need to know is what you will tell.'],
          { choice: [{ t: 'The truth. All of it. Even the part about me.', end: 'truth', then: [['father', "Then we'll start there. Slowly."]] }, { t: 'It was the new girls. They took it too far.', end: 'blame', then: [['father', 'I see.'], ['narr', "He doesn't write anything down. He doesn't need to."]] }, { t: 'Nothing happened, Father.', end: 'silence', then: [['father', 'Then go home, Anya. And sleep with the light on.']] }] }
        ] }
      ] }
  ],
  elise: [
    { title: 'Rehearsal', blurb: "Practice. Eight counts at a time. Don't look at the corner.", hour: 16.6, spawn: [30, 2, Math.PI / 2],
      cast: N => { N.coach.place(...SPOT.gymCoach); N.anya.place(64, -3, -2.6); ['marisol', 'bridget', 'tasha', 'nora'].forEach((k, i) => N[k].place(SPOT.dancers[i][0], SPOT.dancers[i][1], Math.PI / 2)); N.elise.setVisible(false); },
      obj: [
        { type: 'goto', place: () => P.gym_floor, text: 'Get to practice in the gym' },
        { type: 'rhythm', diff: 2, text: 'Dance the routine' },
        { type: 'talk', npc: 'anya', text: 'Talk to Anya', dlg: [
          ['anya', 'You were half a count behind on the turn.'], ['me', 'I was looking at the corner.'], ['anya', "There's nothing in the corner, Elise."],
          ['anya', "Please don't do this today. Coach is watching. Everybody is watching."],
          { choice: [{ t: 'Then look at me instead.', rel: { anya: 1 }, then: [['anya', '...Not here.'], ['narr', 'But she does. Just for a second.']] }, { t: 'You saw it too. I watched you see it.', rel: { anya: -1 }, then: [['anya', "I didn't see anything."], ['narr', 'She says it to the floor.']] }, { t: 'Fine. Captain.', then: [['anya', "Don't call me that."]] }] }
        ] }
      ], end: 'On the way out someone had written WITCH on your locker. They spelled it right, at least.' },
    { title: 'Follow Her', blurb: "She's been standing at the edge of the quad since practice let out. Nobody else seems to notice.", hour: 18.2, spawn: [-8, 30, Math.PI],
      cast: N => { N.elise.setVisible(false); N.anya.place(36, -1.5, -Math.PI / 2); }, dread: .05,
      obj: [
        { type: 'goto', place: () => P.fountain, text: 'Go to the quad' },
        { type: 'follow', path: GHOST_PATH, text: "Follow the girl in the Lions jacket. Don't lose her." },
        { type: 'interact', place: () => ({ x: -40, z: -165, r: 2.4 }), label: 'Search the ashes', text: 'Search the fire pit', dlg: [['narr', 'Under the ash there is a photograph, half burned. Thirteen girls in Lions jackets on the gym steps.'], ['narr', 'Someone scratched out one face so hard the paper tore. On the back, in pencil: FALL 1987.']] },
        { type: 'vision', place: () => P.clearing, text: 'Stay in the clearing', after: 'Thirteen. The Lions only ever take twelve.' }
      ], end: 'You count the girls in the photo again on the walk home. Thirteen, every time.' },
    { title: 'Rumors', blurb: 'Thursday lunch. Everyone at St. Agatha\'s has a theory, and most of them are about you.', hour: 12.4, spawn: [0, 34, Math.PI],
      cast: N => { N.elise.setVisible(false); N.kevin.place(-6, 14, 2, { wander: false }); N.lauren.place(14, -2, -1, { wander: false }); N.marcus.place(-22, -22, 0, { wander: false }); N.steven.place(...SPOT.bleacherSit, { sit: true, y: 1.35 }); },
      obj: [
        { type: 'talkN', npcs: ['kevin', 'lauren', 'marcus'], text: 'Find out what people are saying', dlgs: {
          kevin: [['kevin', "Is it true you had a seizure in the shower? Danny said you were foaming."], { choice: [{ t: 'It was nothing.' }, { t: 'Ask Danny where he was Saturday night.', then: [['kevin', '...Wait, was Danny there?']] }] }],
          lauren: [['lauren', "My mom says it's the pipes. Like, lead or something. She's calling the diocese."], { choice: [{ t: 'Your mom might be right.' }, { t: "It's not the water.", then: [['lauren', "Then what is it?"], ['narr', "You don't answer. She steps back from you like it's catching."]] }] }],
          marcus: [['marcus', "Steven's telling everyone you girls made it all up. For attention."], { choice: [{ t: 'Steven says a lot of things.', rel: { steven: -1 } }, { t: 'Maybe we did.', then: [['marcus', '...Seriously?'], ['narr', 'You let him wonder.']] }] }]
        } },
        { type: 'talk', npc: 'steven', text: 'Find Steven on the bleachers', dlg: [
          ['steven', 'Elise. Hey. Can I ask you something weird?'], ['steven', "Anya won't talk to me. She talks to you. Is it me? Did I do something?"],
          { choice: [{ t: "It's not you, Steven.", rel: { steven: 1 }, then: [['steven', 'Then what is it?'], ['narr', "You don't answer. He isn't stupid. He just hasn't let himself be smart about this yet."]] }, { t: 'Ask her yourself.', rel: { steven: -1 }, then: [['steven', "Yeah. I'll do that."]] }, { t: "She's scared. We all are.", then: [['steven', 'Of what?'], ['narr', 'You look past him, at the tree line. He follows your eyes and goes quiet.']] }] }
        ] }
      ], end: "By sixth period the rumor was that you'd cursed the team. It was the closest anyone had come all week." },
    { title: 'The Boathouse', blurb: 'You told her ten. You always tell her ten.', hour: 21.8, spawn: [-45, 92, Math.PI], dread: .08,
      cast: N => { N.anya.place(...SPOT.boathouse, { y: .7 }); N.father.place(...SPOT.fatherAltar); N.elise.setVisible(false); },
      obj: [
        { type: 'goto', place: () => P.trailhead, text: 'Sneak to the trail behind the main hall' },
        { type: 'goto', place: () => P.boathouse, text: 'Go to the boathouse' },
        { type: 'talk', npc: 'anya', text: 'Talk to Anya', dlg: [
          ['anya', 'I almost didn\'t come.'], ['me', 'But you did.'],
          ['anya', 'Steven asked me if I\'m in love with someone else. Tonight. In the parking lot. In front of the whole team.'], ['anya', 'I said no.'],
          { choice: [{ t: 'I know. You always say no.', rel: { anya: -1 }, then: [['anya', "That's not fair."], ['me', 'None of this is fair.']] }, { t: 'Then why are you here?', rel: { anya: 1 }, then: [['anya', "Because you're the only one who doesn't look at me like I'm in charge."]] }, { t: 'Tell him the truth. Or I will.', rel: { anya: -2 }, then: [['anya', "You wouldn't."], ['narr', "She's right. You wouldn't. That's the problem with being the one who loves her more."]] }] }
        ] },
        { type: 'vision', place: () => P.dock, ghostAt: () => SPOT.dockEnd, ghostY: .7, text: 'Walk out onto the dock', after: 'Wet footprints lead from the end of the dock to where you are standing. None lead back.' },
        { type: 'talk', npc: 'father', text: 'Go to the chapel. Father Franklin is still up.', dlg: [
          ['father', "Elise. You're shivering. Sit."], ['father', 'Your mother called me. She thinks you are ill. Your teachers think you are performing. What do you think?'],
          { choice: [{ t: 'I think something followed us out of those woods.', end: 'truth' }, { t: "I think I'm the only one telling the truth.", end: 'alone' }, { t: 'I think I want to quit the Lions.', end: 'quit' }] }
        ] }
      ] }
  ],
  steven: [
    { title: 'Two-a-Days', blurb: 'The coaches want sprints. Your head is somewhere else.', hour: 16.3, spawn: [40, 50, Math.PI / 2],
      cast: N => { N.steven.setVisible(false); N.tasha.place(66, 57.85, 0, { sit: true, y: 1.35 }); },
      obj: [
        { type: 'goto', place: () => ({ x: 30, z: 66, r: 4 }), text: 'Get to the start line on Lions Field' },
        { type: 'course', points: COURSE, time: 40, text: 'Sprint drill: hit every cone' },
        { type: 'talk', npc: 'tasha', text: 'Tasha is watching from the bleachers', dlg: [
          ['tasha', "Hey, number twelve. Your girlfriend's been crying in the second floor bathroom. Thought you should know."], ['me', "Anya doesn't cry."],
          ['tasha', 'Then I guess some other girl in a Lions jacket was crying in there.'],
          { choice: [{ t: 'What happened in the woods, Tasha?', then: [['tasha', 'We made a promise. Promises are kind of the whole point.'], ['narr', 'She smiles like it hurts.']] }, { t: 'Mind your business.', then: [['tasha', "That's literally what I'm doing, Steven."]] }] }
        ] }
      ], end: 'You ran the drill clean. Nobody said anything. Nobody ever does when you\'re good.' },
    { title: 'Wheels', blurb: "You told Anya you'd buy her dinner. You've told her a lot of things this week.", hour: 17.6, spawn: [-20, 46, -2.4],
      cast: N => { N.steven.setVisible(false); N.anya.place(SPOT.booth[0], SPOT.booth[1], SPOT.booth[2], { sit: true, y: .06 }); },
      obj: [
        { type: 'goto', place: () => P.parking, text: 'Get to your car in the student lot' },
        { type: 'car', text: 'Get in your car (F). The maroon one.' },
        { type: 'goto', place: () => P.diner_lot, text: "Drive to Dale's Diner on Route 9" },
        { type: 'talk', npc: 'anya', text: 'Sit with Anya', dlg: [
          ['anya', "You're late."], ['me', 'Traffic. Both cars on Route 9 were out tonight.'], ['narr', 'She almost laughs. Almost.'],
          ['anya', 'Steven, I need you to not ask me about the woods.'],
          { choice: [{ t: "Okay. I won't.", rel: { anya: 1 }, then: [['anya', 'Thank you.'], ['narr', 'She reaches for your hand across the table. Her fingers are freezing.']] }, { t: "Everybody's asking about the woods, Anya.", rel: { anya: -1 }, then: [['anya', "And everybody's getting the same answer."]] }, { t: 'Is this about Elise?', rel: { anya: -2 }, flag: 'askedElise', then: [['anya', 'Why would it be about Elise?'], ['narr', 'She says it too fast. You both hear it.']] }] }
        ] }
      ], end: 'Dale gave you the fries for free. He said you two looked like you needed them.' },
    { title: "Something's Off", blurb: 'Anya cancelled on you again. Elise is the only one who might know why.', hour: 19.2, spawn: [-20, 20, -Math.PI / 2],
      cast: N => { N.steven.setVisible(false); N.elise.place(...SPOT.chapelSteps); N.ruth.place(...SPOT.hallSteps); },
      obj: [
        { type: 'talk', npc: 'elise', text: 'Find Elise outside the chapel', dlg: [
          ['elise', "If you're here to yell at me, can you do it fast? I'm cold."], ['me', "I'm not here to yell."], ['elise', 'Then what?'],
          { choice: [{ t: "I think Anya's in trouble.", rel: { elise: 1 }, then: [['elise', "She is. Just not the kind you can fix by driving fast."]] }, { t: 'Stay away from my girlfriend.', rel: { elise: -2 }, then: [['elise', '...Okay, Steven.'], ['narr', "She doesn't sound scared. She sounds sorry for you."]] }, { t: 'What happened out there?', then: [['elise', 'Twelve of us went in. Twelve of us came out. Ask me again why that\'s the scary part.']] }] }
        ] },
        { type: 'talk', npc: 'ruth', text: 'Ruth from the Herald wants you on the hall steps', dlg: [
          ['ruth', 'Steven. The Herald would love a quote.'], ['ruth', "'Star athlete's girlfriend at center of mass hysteria.' I'm workshopping it."],
          { choice: [{ t: 'No comment.', rel: { ruth: -1 } }, { t: 'What do you actually know?', rel: { ruth: 1 }, then: [['ruth', 'I know the Lions did this exact initiation in 1987. And I know the school paper from that October has a page torn out of the archive.'], ['ruth', "Nobody tears a page out of a school paper unless it says something."]] }] }
        ] }
      ], end: 'Ruth\'s question follows you home. Why would anyone tear a page out of a school paper?' },
    { title: 'The Woods', blurb: "Anya's mom called your house at eleven. Anya never came home.", hour: 23.1, spawn: [-45, 92, Math.PI], dread: .1,
      cast: N => { N.steven.setVisible(false); N.anya.place(...SPOT.boathouse, { y: .7 }); },
      obj: [
        { type: 'goto', place: () => P.trailhead, text: 'Find Anya. Start at the trail behind the main hall.' },
        { type: 'goto', place: () => P.clearing, text: 'Search the clearing' },
        { type: 'vision', place: () => P.clearing, text: 'Someone is in the clearing', after: "It wasn't Anya. You're sure it wasn't Anya." },
        { type: 'goto', place: () => P.boathouse, text: 'Check the boathouse' },
        { type: 'talk', npc: 'anya', text: 'Talk to Anya', dlg: [
          ['anya', 'Steven? How did you find me?'], ['me', 'Your mom called. Everyone is looking for you.'], ['anya', 'I needed somewhere nobody would look.'],
          ['anya', "There's something I have to tell you. You're going to hate me, and you're allowed to."],
          { choice: [{ t: "Whatever it is, we'll deal with it.", end: 'stay' }, { t: 'Is it Elise?', end: 'know' }, { t: "Not tonight. Let's get you home.", end: 'home' }] }
        ] }
      ] }
  ],
  custom: [
    { title: 'The New Kid', blurb: 'First week at St. Agatha\'s. The school paper already wants you.', hour: 15.8, spawn: [0, 30, Math.PI],
      cast: N => { N.ruth.place(...SPOT.hallSteps); N.anya.place(...SPOT.quadAnya); },
      obj: [
        { type: 'talk', npc: 'ruth', text: 'Meet Ruth on the main hall steps', dlg: [
          ['ruth', "You're the transfer. {name}, right? I'm Ruth. I run The Agatha Herald, which is a generous way of saying I own a stapler."],
          ['ruth', 'Welcome gift.'], ['narr', 'She hands you a scuffed camcorder. The tape inside is labeled DO NOT ERASE in someone else\'s handwriting.'],
          ['ruth', "Something happened to the dance team last weekend and everyone is lying about it. You're new. Nobody has a reason to lie to you yet."],
          { choice: [{ t: "I'm in.", rel: { ruth: 1 } }, { t: 'Why me?', then: [['ruth', "Because you don't know who matters yet. That makes you dangerous."]] }] }
        ] },
        { type: 'photo', targets: [{ x: 0, y: 3.2, z: 26, label: 'the statue of St. Agatha' }], text: 'Press C for the camcorder. Film the statue of St. Agatha.' }
      ], end: 'The tape counter reads 0:00:00. You could swear it said 0:04:12 before you pressed record.' },
    { title: 'Evidence', blurb: 'Ruth has a theory: the strange stuff only shows up on tape.', hour: 18.3, spawn: [0, 40, Math.PI],
      cast: N => { N.ruth.place(...SPOT.hallSteps); }, anomalies: true,
      obj: [
        { type: 'photo', anomalies: true, targets: [{ x: 70, y: 2.6, z: 57.85, label: 'the figure on the bleachers' }, { x: -44.9, y: 11.2, z: 0, label: 'the chapel window' }, { x: 0, y: .8, z: 0, label: 'the fountain' }], text: 'Film the anomalies. They only appear through the camcorder.' },
        { type: 'talk', npc: 'ruth', text: 'Show Ruth the tape', dlg: [
          ['ruth', 'Let me see.'], ['narr', "She watches it twice. The second time she turns the sound up. Under the hiss there's breathing that isn't yours."],
          ['ruth', "Okay. We're not printing that. Nobody would believe it. I don't believe it and I'm looking at it."],
          ['ruth', 'We need people. Real quotes. Start with the captain, the boyfriend, and Elise.']
        ] }
      ], end: 'At home you play the tape again. The figure on the bleachers is closer than you remember filming her.' },
    { title: 'Sources', blurb: 'Three people who were there. Three people with a reason to lie.', hour: 12.5, spawn: [0, 34, Math.PI],
      cast: N => { N.anya.place(...SPOT.quadAnya); N.elise.place(...SPOT.chapelSteps); N.steven.place(...SPOT.parkSteven); },
      obj: [
        { type: 'talk', npc: 'anya', text: 'Interview Anya on the quad', dlg: [
          ['anya', "You're Ruth's new kid with the camera."], ['anya', "Let me save you time. There's no story. We had a sleepover. Some girls got sick. Probably the water."],
          { choice: [{ t: 'Then why do you look so scared?', rel: { anya: -1 }, then: [['anya', 'Turn that thing off and walk away.']] }, { t: 'Off the record?', rel: { anya: 1 }, then: [['narr', 'She glances at the woods behind the main hall.'], ['anya', "Don't go back there after dark. That's all you get."]] }] }
        ] },
        { type: 'talk', npc: 'elise', text: 'Interview Elise by the chapel', dlg: [
          ['elise', 'Are you recording?'],
          { choice: [{ t: 'Yes.', rel: { elise: 1 }, then: [['elise', 'Good. Get this down exactly: I am not making it up. None of us are.']] }, { t: 'No.', rel: { elise: -1 }, then: [['elise', "The red light's on. You're a bad liar. That's almost sweet."]] }] },
          ['elise', 'Ask Anya why there were thirteen candles. We only brought twelve.']
        ] },
        { type: 'talk', npc: 'steven', text: 'Interview Steven in the lot', dlg: [
          ['steven', "If this is about Anya, I've got nothing to say."],
          { choice: [{ t: "It's about you.", rel: { steven: 1 }, then: [['steven', "Me? I'm just the guy everyone thinks did something. I wasn't even there. I was at Marcus's. Ask Marcus."]] }, { t: 'Anya told me to talk to you.', rel: { steven: -1 }, then: [['steven', 'She did?'], ['narr', 'His whole face changes. He wants it to be true so badly.'], ['steven', "...She didn't, did she."]] }] }
        ] }
      ], end: "Three interviews, three stories. One detail matched: everybody stopped talking when you said the word 'lake.'" },
    { title: 'The Clearing', blurb: 'Pruitt patrols after ten. The clearing is just past the trail.', hour: 23.3, spawn: [-45, 92, Math.PI], dread: .1,
      cast: N => { N.ruth.place(SPOT.booth[0], SPOT.booth[1], SPOT.booth[2], { sit: true, y: .06 }); },
      obj: [
        { type: 'goto', place: () => P.trailhead, text: 'Sneak onto the trail behind the main hall' },
        { type: 'goto', place: () => P.clearing, text: 'Find the clearing' },
        { type: 'collect', items: RIBBONS, label: 'Take the red ribbon', text: 'Collect the red ribbons as evidence' },
        { type: 'vision', place: () => P.clearing, text: 'Film the circle', after: 'The camcorder kept recording after you dropped it. You will not watch that part.' },
        { type: 'talk', npc: 'ruth', text: "Meet Ruth at Dale's Diner. It's open late.", dlg: [
          ['ruth', 'You look like you saw a ghost. Is that a joke? I can\'t tell anymore.'],
          ['ruth', "Print deadline is seven a.m. We have the tape, the ribbons, three quotes and a missing page from 1987. What's the headline?"],
          { choice: [{ t: "'Twelve Went In.' Print all of it.", end: 'publish' }, { t: 'We bury it. Those girls have enough.', end: 'bury' }, { t: 'Give the tape to Father Franklin.', end: 'church' }] }
        ] }
      ] }
  ]
};
const ENDINGS = {
  anya: {
    truth: ['The Truth', () => `You tell him everything. The candles, the oath, the lake, the girl you are not supposed to love. When you walk out, the sun is coming up over the field. ${(Game.rel.elise || 0) >= 1 ? 'Elise is sitting on the chapel steps. She waited.' : 'The steps are empty. It still feels lighter than it has in years.'}`],
    blame: ['The Captain', () => "By Monday the story has a shape, and it isn't yours to carry. The Lions dance on Friday. Two girls don't come back to the team. In the gym mirror, during warmups, there are thirteen of you."],
    silence: ['The Quiet', () => 'You say nothing. Everyone says nothing. The visions stop for a week. Then Nora calls at three in the morning and she doesn\'t say anything either. You can hear water.']
  },
  elise: {
    truth: ['The Witness', () => 'He listens to all of it. When you mention the photograph, he goes to the sacristy and comes back with a yearbook from 1987, opened to the Lions. Thirteen girls. He doesn\'t say anything for a long time.'],
    alone: ['The Outsider', () => 'Maybe you are. Telling the truth at St. Agatha\'s doesn\'t make you right. It makes you loud. On Friday, from the bleachers, you watch them dance without you.'],
    quit: ['The Exit', () => 'You hand in the jacket Monday morning. Coach doesn\'t ask why. That night you sleep eight hours for the first time in a week. In the morning there is lake water on your bedroom floor, in the shape of bare feet, leading to the window.']
  },
  steven: {
    stay: ['The Boyfriend', () => 'She tells you. You listen. You drive her home with the windows down so neither of you has to talk. In the rearview, for half a second, there is a girl in a wet Lions jacket in the back seat.'],
    know: ['The Good Guy', () => "You'd known for a while. Saying it out loud doesn't break anything that wasn't already broken. On Friday the Lions dance. Anya finds you in the stands, and then keeps looking past you, for someone else."],
    home: ['The Drive', () => "You don't let her say it. You tell yourself it's kindness. At the end of the drive she says thank you, and it sounds like goodbye, because it is."]
  },
  custom: {
    publish: ['The Story', () => "Friday's Herald sells out by first period. By lunch the diocese has called the principal, and by sixth the principal has called your parents. The tape goes missing from Ruth's locker that weekend."],
    bury: ['The Kindness', () => 'Ruth runs a piece about the bake sale instead. Anya nods at you in the hallway on Monday, which from her is practically a medal. The tape stays in your drawer. Some nights you hear it rewinding by itself.'],
    church: ['The Archive', () => 'Father Franklin takes the tape without watching it. Two days later Ruth finds the missing 1987 page in the church office trash, burned at the edges. The headline: THIRTEENTH LION FOUND AT LAKE.']
  }
};
const ROMAN = ['I', 'II', 'III', 'IV', 'V'];

/* ---------- objective markers & items ---------- */
const beacon = (() => {
  const t = canvasTex(8, 128, (g, w, h) => { const gr = g.createLinearGradient(0, h, 0, 0); gr.addColorStop(0, 'rgba(255,255,255,.9)'); gr.addColorStop(.3, 'rgba(255,255,255,.35)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = gr; g.fillRect(0, 0, w, h); }, { repeat: false });
  const m = new THREE.Mesh(new THREE.CylinderGeometry(.55, .55, 70, 20, 1, true), new THREE.MeshBasicMaterial({ map: t, color: 0xd9b064, transparent: true, opacity: .5, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
  m.geometry.translate(0, 35, 0); m.visible = false; scene.add(m); return m;
})();
const ItemsLayer = new THREE.Group(); scene.add(ItemsLayer);
function makeRibbon(x, z) {
  const g = new THREE.Group(); const y0 = heightAt(x, z);
  const stake = new THREE.Mesh(new THREE.CylinderGeometry(.025, .035, 1.8, 6), MAT.woodDark); stake.position.y = .9; stake.rotation.z = .06; stake.castShadow = true; g.add(stake);
  const knot = new THREE.Mesh(new THREE.TorusGeometry(.16, .035, 6, 14), MAT.ribbon); knot.rotation.x = Math.PI / 2; knot.position.y = 1.55; g.add(knot);
  const tails = []; for (const s of [-1, 1]) { const t = new THREE.Mesh(new THREE.PlaneGeometry(.06, .7), MAT.ribbon); t.geometry.translate(0, -.35, 0); t.position.set(s * .08, 1.55, .12); g.add(t); tails.push(t); }
  const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: World.softDot, color: 0xff3a3a, transparent: true, opacity: .3, blending: THREE.AdditiveBlending, depthWrite: false })); glow.scale.setScalar(.55); glow.position.y = 1.5; g.add(glow);
  g.position.set(x, y0, z); g.userData.tails = tails; ItemsLayer.add(g); return g;
}
function makeRing(x, z) {
  const m = new THREE.Mesh(new THREE.TorusGeometry(1.4, .08, 8, 32), new THREE.MeshBasicMaterial({ color: 0xd9b064, transparent: true, opacity: .85, blending: THREE.AdditiveBlending, depthWrite: false }));
  m.position.set(x, heightAt(x, z) + 1.5, z); ItemsLayer.add(m); return m;
}
// anomalies only visible through the camcorder
const Anomaly = { list: [], on: false };
function buildAnomalies() {
  const sil = canvasTex(128, 256, (g, w, h) => { g.fillStyle = 'rgba(0,0,0,0)'; g.fillRect(0, 0, w, h); g.fillStyle = '#ff2a2a'; g.beginPath(); g.ellipse(64, 60, 22, 28, 0, 0, TAU); g.fill(); g.beginPath(); g.moveTo(30, 250); g.quadraticCurveTo(26, 120, 64, 92); g.quadraticCurveTo(102, 120, 98, 250); g.fill(); }, { repeat: false });
  const win = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 2.8), new THREE.MeshBasicMaterial({ map: sil, transparent: true, color: 0xffffff, depthWrite: false })); win.position.set(-44.88, 11.2, 0); /* in front of the east rose window, on the roof's end cap */ win.rotation.y = Math.PI / 2; win.visible = false; scene.add(win);
  Anomaly.window = win;
  Anomaly.redWater = new THREE.MeshStandardMaterial({ color: 0x5a0606, roughness: .08, metalness: .1, normalMap: TEX.water, emissive: 0x3a0000, emissiveIntensity: .6 });
}
function setAnomalies(on) {
  Anomaly.on = on;
  const m = Game.mission; const active = on && m && m.anomalies;
  if (Anomaly.window) Anomaly.window.visible = !!active;
  if (World.fountainWater) World.fountainWater.material = active ? Anomaly.redWater : MAT.water;
  const gh = NPCS.ghost;
  if (active) { if (!gh.visible || gh.anomaly !== 'bleachers') { gh.place(70, 57.85, 0, { sit: true, y: 1.35 }); gh.anomaly = 'bleachers'; gh.ghost = false; gh.setVisible(true); } }
  else if (gh.anomaly === 'bleachers') { gh.setVisible(false); gh.anomaly = null; gh.ghost = true; }
}

const Missions = {
  list() { return MISSIONS[Game.role] || []; },
  async start(mi, oi = 0, opts = {}) {
    Game.mi = mi; Game.oi = oi; Game.free = false;
    const m = Game.mission = this.list()[mi]; if (!m) return;
    Game.busy = true; Player.frozen = true;
    if (!opts.noFade) await fadeOut(700);
    this.clearItems();
    defaultCast();
    if (Game.role === 'custom') { /* everyone stays */ } else NPCS[Game.role]?.setVisible(false);
    m.cast && m.cast(NPCS);
    setHour(m.hour + (oi > 0 ? .3 : 0));
    const sp = m.spawn; placePlayer(sp[0], sp[1], sp[2]); Cam.yaw = sp[2]; Cam.pitch = .15;
    Guard.sus = 0; Guard.chase = false;
    Vision.target = 0; setAnomalies(false);
    // replay "after" hooks for skipped objectives (continue mid-chapter)
    for (let i = 0; i < oi; i++) if (typeof m.obj[i].after === 'function') m.obj[i].after();
    $('#hud-chap').textContent = `Chapter ${ROMAN[mi]}`; $('#hud-mtitle').textContent = m.title;
    await fadeIn(900);
    if (oi === 0) banner(`Chapter ${ROMAN[mi]}`, m.title, m.blurb);
    Game.busy = false; Player.frozen = false;
    this.setObjective(oi);
  },
  setObjective(i) {
    const m = Game.mission; Game.oi = i; this.clearItems(); Game.snapped = new Set(); Game.collected = 0;
    const o = Game.obj = m.obj[i];
    if (!o) return this.complete();
    o._done = false;
    if (o.type === 'collect') o._items = o.items.map(([x, z]) => ({ x, z, mesh: makeRibbon(x, z), got: false }));
    if (o.type === 'course') { o._idx = 0; o._t = o.time; o._rings = o.points.map(([x, z]) => makeRing(x, z)); }
    if (o.type === 'follow') { o._i = 0; const gh = NPCS.ghost; const [x, z] = o.path[0]; gh.place(x, z, 0); gh.ghost = true; gh.setVisible(true); gh.walkSpeed = 2.4; }
    if (o.type === 'talkN') o._talked = new Set();
    if (o.type === 'rhythm') setTimeout(() => this.runRhythm(o), 900);
    if (o.type === 'photo' && o.anomalies) toast('Press C to raise the camcorder.');
    if (o.type === 'car') toast('Walk up to a car and press F.');
    this.updateHud();
    this.save();
  },
  objPlace() {
    const o = Game.obj; if (!o || Game.free) return null;
    if (o.type === 'talk') { const n = NPCS[o.npc]; return n ? { x: n.pos.x, z: n.pos.z, y: (n.sit ? n.seatY + 1.3 : n.pos.y + 2.1), r: 2.6 } : null; }
    if (o.type === 'talkN') { let best = null, bd = 1e9; for (const id of o.npcs) { if (o._talked.has(id)) continue; const n = NPCS[id]; const d = Math.hypot(n.pos.x - Player.pos.x, n.pos.z - Player.pos.z); if (d < bd) { bd = d; best = n; } } return best ? { x: best.pos.x, z: best.pos.z, y: best.pos.y + 2.1, r: 2.6 } : null; }
    if (o.type === 'collect') { let best = null, bd = 1e9; for (const it of o._items) { if (it.got) continue; const d = Math.hypot(it.x - Player.pos.x, it.z - Player.pos.z); if (d < bd) { bd = d; best = it; } } return best ? { x: best.x, z: best.z, y: heightAt(best.x, best.z) + 1.6, r: 2 } : null; }
    if (o.type === 'course') { const p = o.points[o._idx]; return p ? { x: p[0], z: p[1], y: 1.5, r: 2.4 } : null; }
    if (o.type === 'follow') { const g = NPCS.ghost; return { x: g.pos.x, z: g.pos.z, y: g.pos.y + 2, r: 0 }; }
    if (o.type === 'photo') { for (const [i, t] of o.targets.entries()) if (!Game.snapped.has(i)) return { x: t.x, z: t.z, y: t.y + 1, r: 0 }; return null; }
    if (o.type === 'car') { const c = World.vehicles.find(v => v.name === 'Steven' && !v.ai) || nearestCar(1e9); return c ? { x: c.pos.x, z: c.pos.z, y: 2, r: 0 } : null; }
    if (o.type === 'rhythm' || o.type === 'time') return null;
    const p = typeof o.place === 'function' ? o.place() : o.place; if (!p) return null;
    return { x: p.x, z: p.z, y: groundAt(p.x, p.z) + 1.4, r: p.r || 4 };
  },
  updateHud() {
    const o = Game.obj; let t = o ? o.text : '';
    if (Game.free) { $('#hud-chap').textContent = 'Free roam'; $('#hud-mtitle').textContent = 'Fairhaven'; t = 'Explore. Press J for your journal.'; }
    else if (o?.type === 'collect') t += ` (${o._items.filter(i => i.got).length}/${o._items.length})`;
    else if (o?.type === 'talkN') t += ` (${o._talked.size}/${o.npcs.length})`;
    else if (o?.type === 'photo' && o.targets.length > 1) t += ` (${Game.snapped.size}/${o.targets.length})`;
    else if (o?.type === 'course') t += ` · ${o._idx}/${o.points.length} · ${Math.max(0, o._t).toFixed(1)}s`;
    if ($('#hud-obj').textContent !== t) $('#hud-obj').textContent = t;
  },
  update(dt) {
    const o = Game.obj; if (!o || Game.free || Game.busy) return;
    const p = Player.pos;
    const near = (pl, r) => pl && Math.hypot(pl.x - p.x, pl.z - p.z) < (r || pl.r || 4);
    if (o.type === 'goto' && near(typeof o.place === 'function' ? o.place() : o.place)) this.next();
    if (o.type === 'car' && Player.car) this.next();
    if (o.type === 'vision' && !o._running && near(o.place(), 4.5)) this.runVision(o);
    if (o.type === 'collect') { for (const it of o._items) { if (it.got) continue; const tt = performance.now() / 1000; it.mesh.userData.tails.forEach((t, k) => t.rotation.z = Math.sin(tt * 2.4 + k) * .25); } }
    if (o.type === 'course') {
      o._t -= dt; const pt = o.points[o._idx];
      o._rings.forEach((r, i) => { r.visible = i >= o._idx; r.material.opacity = i === o._idx ? .95 : .25; r.rotation.y += dt * (i === o._idx ? 1.5 : .3); });
      if (pt && Math.hypot(pt[0] - p.x, pt[1] - p.z) < 2.6) { o._idx++; AudioFX.tone(660 + o._idx * 60, .25, { gain: .08, type: 'triangle' }); if (o._idx >= o.points.length) { toast(`Drill complete · ${(o.time - o._t).toFixed(1)}s`); this.next(); return; } }
      if (o._t <= 0) { toast('Too slow. Back to the start line.'); o._idx = 0; o._t = o.time; placePlayer(30, 64, 0); }
      this.updateHud();
    }
    if (o.type === 'follow') {
      const gh = NPCS.ghost; const d = Math.hypot(gh.pos.x - p.x, gh.pos.z - p.z);
      gh.hidden = Math.random() < (d > 14 ? .08 : .02);
      if (!gh.target) {
        if (o._i < o.path.length - 1 && d < 20) { o._i++; const [x, z] = o.path[o._i]; gh.goTo(x, z, 2.4); }
        else if (o._i >= o.path.length - 1 && d < 9) { gh.setVisible(false); AudioFX.whisper(2, .12); toast('She was standing right there. Now there is only the fire pit.'); this.next(); }
      }
      if (d > 20 && gh.target) { gh.target = null; }
    }
  },
  async next() {
    const o = Game.obj; if (!o || o._done) return; o._done = true;
    if (typeof o.after === 'function') o.after();
    AudioFX.pickup();
    const m = Game.mission;
    if (Game.oi + 1 < m.obj.length) this.setObjective(Game.oi + 1);
    else this.complete();
  },
  async complete() {
    const m = Game.mission; const role = Game.role;
    Game.obj = null; this.clearItems(); $('#hud-obj').textContent = '';
    const last = Game.mi >= this.list().length - 1;
    if (last && Game.flags.ending) { await wait(800); return showEnding(role, Game.flags.ending); }
    AudioFX.success();
    banner('Chapter complete', m.title, m.end, true);
    Game.mi++; Game.oi = 0; this.save();
    await wait(5600);
    if (Game.state === 'play' && !Game.free) this.start(Game.mi, 0);
  },
  event(name, data) {
    const o = Game.obj; if (!o) return;
    if (name === 'talked' && o.type === 'talk' && data === o.npc) this.next();
  },
  async interact(npc) {
    const o = Game.obj;
    if (o && o.type === 'talk' && o.npc === npc.id && !Game.free) { await runDialogue(o.dlg, npc); this.event('talked', npc.id); return; }
    if (o && o.type === 'talkN' && o.npcs.includes(npc.id) && !o._talked.has(npc.id)) { await runDialogue(o.dlgs[npc.id], npc); o._talked.add(npc.id); this.updateHud(); if (o._talked.size >= o.npcs.length) this.next(); else AudioFX.pickup(); return; }
    await runDialogue(chatterFor(npc), npc);
  },
  async runRhythm(o) {
    Game.busy = true; Player.frozen = true;
    const sp = SPOT.gymMe; placePlayer(sp[0], sp[1], sp[2]);
    const dancers = ['marisol', 'bridget', 'tasha', 'nora', 'anya'].map(k => NPCS[k]).filter(n => n.visible && Math.hypot(n.pos.x - 60, n.pos.z) < 12);
    dancers.forEach((n, i) => { const d = SPOT.dancers[i % SPOT.dancers.length]; n.place(d[0], d[1], Math.PI / 2); n.dancing = true; });
    letterbox(true); Player.dancing = true;
    const res = await Rhythm.play(o.diff);
    dancers.forEach(n => n.dancing = false); Player.dancing = false;
    letterbox(false); camRelease(); Player.char.mode = 'idle';
    Game.busy = false; Player.frozen = false;
    if (res.pass) { toast(`Routine: ${Math.round(res.acc * 100)}% · ${res.acc > .9 ? 'Perfect' : res.acc > .75 ? 'Sharp' : 'Good enough'}`); this.next(); }
    else { toast(`Routine: ${Math.round(res.acc * 100)}%. Coach: "Again. From the top."`); setTimeout(() => this.runRhythm(o), 1800); }
  },
  async runVision(o) {
    o._running = true; Game.busy = true; Player.frozen = true; letterbox(true);
    if (document.pointerLockElement) document.exitPointerLock();
    const gh = NPCS.ghost; const p = Player.pos;
    let gx, gz, gy = o.ghostY;
    if (o.ghostAt) [gx, gz] = o.ghostAt();
    else { const pl = o.place(); const a = Math.atan2(pl.x - p.x, pl.z - p.z); gx = pl.x + Math.sin(a) * 5; gz = pl.z + Math.cos(a) * 5; }
    gh.ghost = true; gh.place(gx, gz, Math.atan2(p.x - gx, p.z - gz), { y: gy != null ? gy : undefined }); gh.setVisible(true); gh.hidden = true;
    const look = new THREE.Vector3(gx, (gy || groundAt(gx, gz)) + 1.4, gz);
    const dir = new THREE.Vector3(gx - p.x, 0, gz - p.z).normalize();
    camOverride(new THREE.Vector3(p.x - dir.x * 2.2 + dir.z * .6, p.y + 1.7, p.z - dir.z * 2.2 - dir.x * .6), look, 2);
    Player.yaw = Math.atan2(dir.x, dir.z); Player.char.root.rotation.y = Player.yaw;
    AudioFX.sting(); Vision.target = .55; AudioFX.whisper(4, .16);
    await wait(1400);
    for (const k of [0, .35, .65]) {
      const x = lerp(gx, p.x, k), z = lerp(gz, p.z, k); gh.pos.set(x, gh.pos.y, z); gh.yaw = Math.atan2(p.x - x, p.z - z);
      gh.hidden = false; Vision.target = .6 + k * .5; Cam.shake = .3;
      await wait(520); gh.hidden = true; await wait(260);
    }
    AudioFX.tone(38, 1.6, { gain: .8, freqEnd: 22 }); gradePass.uniforms.uFlash.value = 1;
    gh.setVisible(false); await wait(120); gradePass.uniforms.uFlash.value = 0;
    await fadeOut(150); await wait(500); Vision.target = 0; await fadeIn(1400);
    letterbox(false); camRelease(); Game.busy = false; Player.frozen = false;
    if (o.after) toast(o.after);
    o._running = false; this.next();
  },
  clearItems() { while (ItemsLayer.children.length) ItemsLayer.remove(ItemsLayer.children[0]); const gh = NPCS.ghost; if (gh && gh.visible && !gh.anomaly) gh.setVisible(false); },
  save() {
    if (!Game.role) return;
    store.set('save', { role: Game.role, custom: Game.custom, mi: Game.mi, oi: Game.oi, rel: Game.rel, flags: Game.flags, free: Game.free, hour: TOD.hour, t: Date.now() });
  }
};

/* ============================== interaction ============================== */
let focusTarget = null;
function findInteract() {
  const p = Player.pos; let best = null, bd = 1e9;
  if (Player.car) { focusTarget = { kind: 'exit', label: Math.abs(Player.car.speed) > 4 ? 'Slow down to get out' : 'Get out', key: 'F' }; return focusTarget; }
  const fwdX = Math.sin(Player.yaw), fwdZ = Math.cos(Player.yaw);
  for (const n of NPCList) {
    if (!n.visible || !n.talkable || n.dancing || n.id === 'pruitt' && Guard.active) continue;
    const dx = n.pos.x - p.x, dz = n.pos.z - p.z, d = Math.hypot(dx, dz); if (d > 2.6) continue;
    const score = d - (dx * fwdX + dz * fwdZ) / (d || 1) * .8; if (score < bd) { bd = score; best = { kind: 'npc', npc: n, label: `Talk to ${n.name}`, key: 'E' }; }
  }
  const o = Game.obj;
  if (o && o.type === 'collect') for (const it of o._items) { if (it.got) continue; const d = Math.hypot(it.x - p.x, it.z - p.z); if (d < 2.4 && d < bd + 1) { bd = d; best = { kind: 'item', item: it, label: o.label, key: 'E' }; } }
  if (o && o.type === 'interact') { const pl = o.place(); if (Math.hypot(pl.x - p.x, pl.z - p.z) < (pl.r || 2.4)) best = { kind: 'objInteract', label: o.label, key: 'E' }; }
  for (const it of World.interactables) { const d = Math.hypot(it.x - p.x, it.z - p.z); if (d < it.r && d < bd) { bd = d; best = { kind: 'world', it, label: it.label, key: 'E' }; } }
  if (!best) { const car = nearestCar(3.2); if (car) best = { kind: 'car', car, label: `Get in${car.name === 'Steven' ? (Game.role === 'steven' ? ' your car' : " Steven's car") : ''}`, key: 'F' }; }
  focusTarget = best; return best;
}
async function doInteract(t) {
  if (!t) return;
  if (t.kind === 'npc') await Missions.interact(t.npc);
  else if (t.kind === 'item') { t.item.got = true; ItemsLayer.remove(t.item.mesh); AudioFX.pickup(); Vision.target = .25; setTimeout(() => Vision.target = 0, 1200); Missions.updateHud(); const o = Game.obj; if (o._items.every(i => i.got)) Missions.next(); }
  else if (t.kind === 'objInteract') { const o = Game.obj; if (o.dlg) await runDialogue(o.dlg, null); Missions.next(); }
  else if (t.kind === 'world') t.it.run();
  else if (t.kind === 'car') enterCar(t.car);
  else if (t.kind === 'exit') exitCar();
}

/* ============================== camcorder ============================== */
function togglePhoto(on = !Game.photo) {
  if (Player.car && on) return;
  Game.photo = on; $('#photo').hidden = !on; Cam.fovKick = on ? -18 : 0; gradePass.uniforms.uCam.value = on ? .55 : 0;
  $('#hud').classList.toggle('photo', on); if (Player.char) Player.char.root.visible = !on;
  setAnomalies(on);
  AudioFX.tone(on ? 1200 : 800, .08, { gain: .05, type: 'square', bus: 'ui' });
}
function photoUpdate() {
  if (!Game.photo) return;
  const o = Game.obj; let lockI = -1;
  if (o && o.type === 'photo') {
    o.targets.forEach((t, i) => { if (Game.snapped.has(i)) return; const v = new THREE.Vector3(t.x, t.y, t.z); const d = v.distanceTo(camera.position); v.project(camera); if (v.z < 1 && Math.abs(v.x) < .22 && Math.abs(v.y) < .3 && d < 48) lockI = i; });
  }
  $('#vf-center').classList.toggle('lock', lockI >= 0);
  const hh = Math.floor(TOD.hour), mm = Math.floor((TOD.hour % 1) * 60);
  $('#vf-info').textContent = `OCT.14.2004 ${String(hh % 12 || 12).padStart(2, ' ')}:${String(mm).padStart(2, '0')} ${hh >= 12 ? 'PM' : 'AM'}`;
  $('#vf-count').textContent = o && o.type === 'photo' ? (lockI >= 0 ? 'SUBJECT ▸ ' + o.targets[lockI].label.toUpperCase() : `${Game.snapped.size}/${o.targets.length} ON TAPE`) : 'SP ▸ STANDBY';
  if (Input.hit('Mouse0') || Input.hit('Space')) {
    AudioFX.camera(); gradePass.uniforms.uFlash.value = .7; setTimeout(() => gradePass.uniforms.uFlash.value = 0, 90);
    if (lockI >= 0) { Game.snapped.add(lockI); toast(`On tape: ${o.targets[lockI].label}.`); if (o.anomalies) { AudioFX.whisper(1.6, .1); Vision.target = .3; setTimeout(() => Vision.target = 0, 900); } Missions.updateHud(); if (Game.snapped.size >= o.targets.length) { setTimeout(() => { togglePhoto(false); Missions.next(); }, 700); } }
  }
}

/* ============================== rhythm ============================== */
const Rhythm = {
  play(diff) {
    return new Promise(resolve => {
      const bpm = 112, bars = 14, spb = 60 / bpm;
      const useAudio = AudioFX.ready && AudioFX.ctx.state === 'running';
      const music = useAudio ? AudioFX.startSong(bpm, bars) : null;
      const t0 = music ? music.start : performance.now() / 1000 + .25;
      const now = () => music ? AudioFX.ctx.currentTime : performance.now() / 1000;
      const notes = []; const r = mulberry32(diff * 31 + 7); let lane = 1;
      for (let b = 8; b < bars * 4 - 2; b++) {
        if (r() < (diff > 1 ? .9 : .75)) { lane = (lane + 1 + Math.floor(r() * 3)) % 4; notes.push({ t: t0 + b * spb, lane, hit: false, judged: false }); }
        if (diff > 1 && r() < .38) notes.push({ t: t0 + (b + .5) * spb, lane: (lane + 2) % 4, hit: false, judged: false });
      }
      const st = { score: 0, combo: 0, good: 0, total: notes.length, flash: [0, 0, 0, 0], judge: '', judgeT: 0 };
      Rhythm.cur = { notes, now };
      const cv = $('#rh-canvas'); $('#rhythm').hidden = false; $('#rh-title').textContent = Game.role === 'anya' ? 'Lead the routine' : 'The routine';
      const dpr = Math.min(2, devicePixelRatio || 1); cv.width = cv.clientWidth * dpr; cv.height = cv.clientHeight * dpr; const g = cv.getContext('2d');
      const keys = [['ArrowLeft', 'KeyD'], ['ArrowDown', 'KeyF'], ['ArrowUp', 'KeyJ'], ['ArrowRight', 'KeyK']];
      const press = (ln) => {
        const tn = now(); st.flash[ln] = 1; let best = null, bd = .2;
        for (const n of notes) if (!n.judged && n.lane === ln && Math.abs(n.t - tn) < bd) { bd = Math.abs(n.t - tn); best = n; }
        if (best) { best.judged = true; best.hit = true; const q = bd < .07 ? 'Perfect' : 'Good'; st.score += q === 'Perfect' ? 300 : 120; st.combo++; st.good += q === 'Perfect' ? 1 : .7; st.judge = q; st.judgeT = .5; AudioFX.tone(q === 'Perfect' ? 1318 : 988, .08, { gain: .03, bus: 'ui' }); }
      };
      const tap = e => { const r = cv.getBoundingClientRect(); const ln = clamp(Math.floor((e.clientX - r.left) / r.width * 4), 0, 3); press(ln); };
      // listen to the keyboard directly: the main loop clears Input.pressed before this frame callback runs,
      // so polling Input.hit() here never saw a key press and every routine failed
      const onKey = e => { if (e.repeat) return; const ln = keys.findIndex(k => k.includes(e.code)); if (ln >= 0) { e.preventDefault(); press(ln); } };
      addEventListener('keydown', onKey);
      cv.style.pointerEvents = 'auto'; cv.addEventListener('pointerdown', tap);
      const ch = Player.char; const orbit = { a: Player.yaw + 2.4 };
      let last = performance.now();
      const frame = () => {
        const tn = now(); const nowMs = performance.now(); const dt = Math.min(.05, (nowMs - last) / 1000); last = nowMs;
        if (Game.autoRhythm) for (const n of notes) if (!n.judged && tn >= n.t - .05) { n.judged = n.hit = true; st.score += 300; st.combo++; st.good++; }
        for (const n of notes) if (!n.judged && tn - n.t > .2) { n.judged = true; st.combo = 0; st.judge = 'Miss'; st.judgeT = .5; }
        const beat = (tn - t0) / spb;
        ch.mode = 'dance'; ch.dance = Math.max(0, beat); NPCList.forEach(n => { if (n.dancing) n.char.dance = Math.max(0, beat + .02); });
        orbit.a += dt * .12; const c = Player.pos;
        camOverride(new THREE.Vector3(c.x + Math.sin(orbit.a) * 6.5, c.y + 2.0 + Math.sin(orbit.a * .7) * .5, c.z + Math.cos(orbit.a) * 6.5), new THREE.Vector3(c.x, c.y + 1.1, c.z), 2.5);
        // draw
        const W = cv.width, H = cv.height, lw = W / 4, hitY = H - 70 * dpr, pps = 520 * dpr;
        g.clearRect(0, 0, W, H);
        const grd = g.createLinearGradient(0, 0, 0, H); grd.addColorStop(0, 'rgba(7,8,12,0)'); grd.addColorStop(1, 'rgba(7,8,12,.6)'); g.fillStyle = grd; g.fillRect(0, 0, W, H);
        for (let ln = 0; ln < 4; ln++) {
          g.strokeStyle = 'rgba(235,229,216,.12)'; g.lineWidth = 1 * dpr; g.beginPath(); g.moveTo(ln * lw + lw / 2, 0); g.lineTo(ln * lw + lw / 2, H); g.stroke();
          st.flash[ln] = Math.max(0, st.flash[ln] - dt * 5);
          const x = ln * lw + lw / 2;
          g.save(); g.translate(x, hitY); g.rotate(Math.PI / 4); g.strokeStyle = `rgba(235,229,216,${.35 + st.flash[ln] * .6})`; g.lineWidth = 2 * dpr; const s = 20 * dpr; g.strokeRect(-s / 2, -s / 2, s, s); g.restore();
          if (st.flash[ln] > 0) { g.fillStyle = `rgba(201,163,94,${st.flash[ln] * .25})`; g.fillRect(ln * lw + 6, hitY - 30 * dpr, lw - 12, 60 * dpr); }
          g.fillStyle = 'rgba(235,229,216,.5)'; g.font = `${12 * dpr}px Archivo, sans-serif`; g.textAlign = 'center'; g.fillText(['←', '↓', '↑', '→'][ln], x, hitY + 38 * dpr);
        }
        for (const n of notes) {
          if (n.hit) continue; const y = hitY - (n.t - tn) * pps; if (y < -30 || y > H + 30) continue;
          const x = n.lane * lw + lw / 2; const s = 22 * dpr;
          g.save(); g.translate(x, y); g.rotate(Math.PI / 4); g.fillStyle = n.judged ? 'rgba(163,39,42,.6)' : '#c9a35e'; g.shadowColor = '#c9a35e'; g.shadowBlur = n.judged ? 0 : 14 * dpr; g.fillRect(-s / 2, -s / 2, s, s); g.restore();
        }
        g.fillStyle = 'rgba(235,229,216,.2)'; g.fillRect(0, hitY, W, 1 * dpr);
        const lastT = notes.length ? notes[notes.length - 1].t : t0;
        g.fillStyle = 'rgba(201,163,94,.8)'; g.fillRect(0, H - 3 * dpr, W * clamp((tn - t0) / (lastT - t0 + 1), 0, 1), 3 * dpr);
        $('#rh-score').textContent = st.score; $('#rh-combo').textContent = st.combo > 3 ? `${st.combo} combo` : (tn < t0 + 8 * spb ? `${Math.max(1, Math.ceil((t0 + 8 * spb - tn) / spb))}` : '');
        st.judgeT -= dt; const j = $('#rh-judge'); j.textContent = st.judgeT > 0 ? st.judge : ''; j.style.color = st.judge === 'Miss' ? '#a3272a' : '';
        if (tn > lastT + 1.2) {
          cv.removeEventListener('pointerdown', tap); removeEventListener('keydown', onKey); cv.style.pointerEvents = 'none'; $('#rhythm').hidden = true; AudioFX.stopSong();
          const acc = st.total ? st.good / st.total : 1; resolve({ pass: acc >= .55, acc }); return;
        }
        requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
    });
  }
};

/* ============================== HUD: minimap & markers ============================== */
const MAPC = document.createElement('canvas'); MAPC.width = MAPC.height = 1024;
function buildMap() {
  const g = MAPC.getContext('2d'), S = 1024, k = S / 1000; const X = x => (x + 500) * k, Z = z => (z + 500) * k;
  const N = 256, img = g.createImageData(N, N);
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    const x = -500 + (i + .5) / N * 1000, z = -500 + (j + .5) / N * 1000; const h = heightAt(x, z), td = treeDensity(x, z) * (treeBlocked(x, z) ? 0 : 1);
    let r = 30 + h * 1.2, gg = 36 + h * 1.2, b = 28 + h * .8; r -= td * 14; gg -= td * 10; b -= td * 10;
    const kk = (j * N + i) * 4; img.data[kk] = r; img.data[kk + 1] = gg; img.data[kk + 2] = b; img.data[kk + 3] = 255;
  }
  const tmp = document.createElement('canvas'); tmp.width = tmp.height = N; tmp.getContext('2d').putImageData(img, 0, 0);
  g.imageSmoothingEnabled = true; g.drawImage(tmp, 0, 0, S, S);
  g.fillStyle = '#2a3d4c'; g.beginPath(); g.arc(X(LAKE.x), Z(LAKE.z), (LAKE.r + 2) * k, 0, TAU); g.fill();
  g.fillStyle = '#3c5a2c'; g.fillRect(X(24), Z(62), 92 * k, 46 * k);
  const line = (pts, w, col, dash) => { g.strokeStyle = col; g.lineWidth = w * k; g.lineCap = 'round'; g.lineJoin = 'round'; g.setLineDash(dash || []); g.beginPath(); pts.forEach(([x, z], i) => i ? g.lineTo(X(x), Z(z)) : g.moveTo(X(x), Z(z))); g.stroke(); g.setLineDash([]); };
  ROADS.forEach(r => line(r.pts, r.w, '#6b6a66'));
  PATHS.forEach(r => line(r.pts, r.w, '#8c877a'));
  TRAILS.forEach(r => line(r.pts, r.w, '#8a6a46', [4, 3]));
  g.fillStyle = '#8c877a'; for (const d of DISCS) { g.beginPath(); g.arc(X(d.x), Z(d.z), d.r * k, 0, TAU); g.fill(); }
  g.fillStyle = '#4a4a48'; for (const r of RECTS_PAVED) g.fillRect(X(r.minX), Z(r.minZ), (r.maxX - r.minX) * k, (r.maxZ - r.minZ) * k);
  g.fillStyle = '#cfc5ae'; for (const f of FOOTPRINTS) { if (f.maxX - f.minX > 80) { } g.fillRect(X(f.minX), Z(f.minZ), (f.maxX - f.minX) * k, (f.maxZ - f.minZ) * k); }
  g.fillStyle = '#3c5a2c'; g.fillRect(X(25), Z(63), 90 * k, 44 * k);
  World.mapReady = true;
}
function drawMapLabels(g, X, Z, scale) {
  g.font = `italic ${13 * scale}px "IM Fell English", Georgia, serif`; g.textAlign = 'center'; g.fillStyle = 'rgba(235,229,216,.85)'; g.shadowColor = '#000'; g.shadowBlur = 4;
  for (const p of Object.values(PLACES)) if (p.label) g.fillText(p.label, X(p.x), Z(p.z) - 10 * scale);
  g.shadowBlur = 0;
}
function drawMinimap() {
  const cv = $('#minimap'), g = cv.getContext('2d'), W = cv.width, R = W / 2;
  const zoom = Player.car ? 1.5 : 2.4; // px per meter at canvas scale
  g.save(); g.clearRect(0, 0, W, W); g.beginPath(); g.arc(R, R, R, 0, TAU); g.clip();
  g.fillStyle = '#14171a'; g.fillRect(0, 0, W, W);
  g.translate(R, R); g.rotate(Math.PI + Cam.yaw);
  const k = 1024 / 1000; const s = zoom / k;
  g.scale(s, s);
  g.drawImage(MAPC, -(Player.pos.x + 500) * k, -(Player.pos.z + 500) * k);
  g.restore();
  // markers in screen space
  const toMini = (x, z) => { const dx = (x - Player.pos.x) * zoom, dz = (z - Player.pos.z) * zoom; const a = Math.PI + Cam.yaw; const c = Math.cos(a), sn = Math.sin(a); return [R + dx * c - dz * sn, R + dx * sn + dz * c]; };
  for (const id of ['anya', 'elise', 'steven']) { const n = NPCS[id]; if (!n || !n.visible || id === Game.role) continue; const [mx, my] = toMini(n.pos.x, n.pos.z); if (Math.hypot(mx - R, my - R) > R - 8) continue; g.fillStyle = '#c46a5a'; g.beginPath(); g.arc(mx, my, 6, 0, TAU); g.fill(); }
  if (Guard.active && Guard.sus > .05) { const n = NPCS.pruitt; const [mx, my] = toMini(n.pos.x, n.pos.z); if (Math.hypot(mx - R, my - R) < R - 8) { g.fillStyle = '#ff3b3b'; g.beginPath(); g.arc(mx, my, 7, 0, TAU); g.fill(); } }
  const op = Missions.objPlace();
  if (op) { let [mx, my] = toMini(op.x, op.z); const d = Math.hypot(mx - R, my - R); if (d > R - 14) { mx = R + (mx - R) / d * (R - 14); my = R + (my - R) / d * (R - 14); } g.save(); g.translate(mx, my); g.rotate(Math.PI / 4); g.fillStyle = '#c9a35e'; g.shadowColor = '#c9a35e'; g.shadowBlur = 10; g.fillRect(-7, -7, 14, 14); g.restore(); }
  // player arrow (always points up = camera forward; rotate by facing offset)
  g.save(); g.translate(R, R); g.rotate(-(Player.yaw - Cam.yaw)); g.fillStyle = '#ebe5d8'; g.beginPath(); g.moveTo(0, -13); g.lineTo(9, 10); g.lineTo(0, 5); g.lineTo(-9, 10); g.closePath(); g.fill(); g.restore();
  // north tick
  const na = Math.PI + Cam.yaw; const nx = R + Math.sin(-na) * 0, ny = 0; void nx; void ny;
  const [tx, ty] = toMini(Player.pos.x, Player.pos.z - 1000); const dd = Math.hypot(tx - R, ty - R); const px = R + (tx - R) / dd * (R - 16), py = R + (ty - R) / dd * (R - 16);
  g.fillStyle = 'rgba(235,229,216,.8)'; g.font = '600 18px Archivo, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('N', px, py);
}
function drawFullMap() {
  const cv = $('#map-canvas'), g = cv.getContext('2d'), W = cv.width, k = W / 1000; const X = x => (x + 500) * k, Z = z => (z + 500) * k;
  g.drawImage(MAPC, 0, 0, W, W); drawMapLabels(g, X, Z, 1.1);
  for (const id of ['anya', 'elise', 'steven']) { const n = NPCS[id]; if (!n || !n.visible || id === Game.role) continue; g.fillStyle = '#c46a5a'; g.beginPath(); g.arc(X(n.pos.x), Z(n.pos.z), 5, 0, TAU); g.fill(); g.fillStyle = '#ebe5d8'; g.font = '11px Archivo, sans-serif'; g.fillText(n.name, X(n.pos.x), Z(n.pos.z) + 16); }
  const op = Missions.objPlace(); if (op) { g.save(); g.translate(X(op.x), Z(op.z)); g.rotate(Math.PI / 4); g.fillStyle = '#c9a35e'; g.fillRect(-7, -7, 14, 14); g.restore(); }
  g.save(); g.translate(X(Player.pos.x), Z(Player.pos.z)); g.rotate(Math.PI - Player.yaw); g.fillStyle = '#ebe5d8'; g.beginPath(); g.moveTo(0, -11); g.lineTo(8, 9); g.lineTo(0, 4); g.lineTo(-8, 9); g.closePath(); g.fill(); g.restore();
}
const _mv = new THREE.Vector3();
function updateMarkers(t) {
  const op = (Game.state === 'play' && !Game.talking && !Game.busy) ? Missions.objPlace() : null;
  const mk = $('#obj-marker');
  if (!op) { mk.style.opacity = 0; beacon.visible = false; return; }
  const d = Math.hypot(op.x - Player.pos.x, op.z - Player.pos.z);
  beacon.visible = d > 7 && Game.obj && !['follow', 'talk', 'talkN'].includes(Game.obj.type) && !(d < 45 && FLOORS.some(f => inRect(op.x, op.z, f)));
  beacon.position.set(op.x, groundAt(op.x, op.z), op.z); beacon.material.opacity = .32 + Math.sin(t * 2.5) * .08;
  _mv.set(op.x, op.y, op.z).project(camera);
  let x = _mv.x, y = _mv.y; const behind = _mv.z > 1;
  if (behind) { x = -x; y = -y; }
  const m = .9; if (behind || Math.abs(x) > m || Math.abs(y) > m) { const s = m / Math.max(Math.abs(x), Math.abs(y)); x *= s; y *= s; }
  mk.style.transform = `translate(${(x * .5 + .5) * innerWidth}px, ${(-y * .5 + .5) * innerHeight}px) translate(-50%,-50%)`;
  mk.style.opacity = d < 3 ? 0 : 1; $('#obj-dist').textContent = `${Math.round(d)} m`;
}
function updateStars() {
  const n = Guard.active ? Math.ceil(Guard.sus - .05) : 0;
  const el = $('#hud-stars'); [...el.children].forEach((s, i) => s.classList.toggle('on', i < n));
  el.classList.toggle('flash', Guard.chase);
  $('#hud-stars-label').textContent = Guard.chase ? 'PRUITT IS ON YOU' : (n ? 'SEEN' : (Guard.active ? 'CURFEW' : ''));
}
let lastHint = '';
function updateHudHint() {
  const h = Player.car ? '<span><kbd>W</kbd><kbd>S</kbd> Drive</span><span><kbd>Space</kbd> Brake</span><span><kbd>F</kbd> Get out</span><span><kbd>M</kbd> Map</span>' : '<span><kbd>E</kbd> Use</span><span><kbd>F</kbd> Car</span><span><kbd>C</kbd> Camcorder</span><span><kbd>M</kbd> Map</span><span><kbd>J</kbd> Journal</span>';
  if (h !== lastHint) { $('#hud-hint').innerHTML = h; lastHint = h; }
}
