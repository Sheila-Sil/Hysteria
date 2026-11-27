HYSTERIA - an unofficial fan game inspired by The Body

Build
  sh build.sh   (concatenates src/ into index.html)

Characters
  Everyone is a realistic, fully rigged human from the Microsoft Rocketbox avatar library,
  converted to assets/people/<id>.glb (hi-poly mesh, 81-bone skeleton, colour + normal maps,
  alpha-tested hair cards). assets/people/anims_f.glb and anims_m.glb hold the shared
  Rocketbox motion-capture clips: idle, look-around, walk, run, talk, dance, sit and sad.
  The game shows its procedural mannequins until each model has streamed in.

Custom character models
  Put rigged .glb files (Mixamo-style skeleton) in assets/, add them to REAL_MODELS in
  src/55_real.js (e.g. anya: 'anya.glb'), add assets/Xbot.glb from the three.js examples
  for animations, and rebuild.

Credits
  three.js; brick, hardwood and water textures from the three.js examples;
  grass texture from OpenGameArt (CC BY 3.0); sky panoramas from Poly Haven HDRIs (CC0);
  people and animations from Microsoft Rocketbox (MIT, see assets/people/LICENSE-Rocketbox.md).
