#!/bin/sh
# Concatenate the source parts into the single-file game.
cd "$(dirname "$0")"
cat src/00_head.html src/10_core.js src/20_textures.js src/30_render.js src/40_world.js src/50_chars.js src/55_real.js src/60_player.js src/70_npc.js src/80_game.js src/90_flow.js src/99_tail.html > index.html
wc -c index.html
