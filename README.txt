HYSTERIA - an unofficial fan game inspired by The Body

Run it
  The game loads textures from the assets folder, so open it through a local web server
  (double-clicking the HTML file won't load the HD textures):
    cd hysteria
    python3 -m http.server 8000
  then open http://localhost:8000/hysteria.html in Chrome, Edge, Firefox or Safari.
  It needs an internet connection the first time (three.js and fonts load from CDNs).

Files
  hysteria.html   the complete game (built from src/)
  assets/         photo textures and sky panoramas
  src/            source parts; run build.sh to rebuild hysteria.html
  build.sh        concatenates src/ into hysteria.html

Custom character models
  Put rigged .glb files (Mixamo-style skeleton) in assets/, add them to REAL_MODELS in
  src/55_real.js (e.g. anya: 'anya.glb'), add assets/Xbot.glb from the three.js examples
  for animations, and rebuild.

Credits
  three.js; brick, hardwood and water textures from the three.js examples;
  grass texture from OpenGameArt (CC BY 3.0); sky panoramas from Poly Haven HDRIs (CC0).
