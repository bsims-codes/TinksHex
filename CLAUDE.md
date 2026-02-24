Build a classic Flappy Bird clone in plain JavaScript using a single HTML5 canvas (no external libraries, no CDNs). Output index.html + game.js (optional assets/ folder). Fixed logical resolution 800×600 with no CSS scaling. Implement an AssetManager with drawSprite(name, x, y, w, h, opts) so v1 uses simple shapes but assets can be swapped later without touching game logic.

Classic gameplay requirements:

Bird physics (tight): bird starts at (x=200, y=300). Gravity constant ~2000 px/s². Flap sets vertical velocity to -520 px/s. Clamp max fall speed to +900 px/s. Bird has slight rotation based on vy (visual only). Bird hitbox smaller than sprite: width=34, height=24 centered on bird.

Pipes: pipe width 90. Pipe pairs spawn every 1.35 seconds (or equivalent spacing at speed). Initial scroll speed 240 px/s. Pipe gap height 170 px (classic/tight). Gap center Y randomized each spawn within safe bounds: minY=120, maxY=480 (ensure top pipe has at least 60px margin from top and bottom pipe clears ground). Pipes scroll left and are removed off-screen.

Collision: AABB collision between bird hitbox and pipe rectangles; collision with ground (y>=540) or ceiling (y<=0) ends run immediately.

Scoring: +1 when bird passes the center x of a pipe pair (only once per pair). Display current score and best score using localStorage.

States: READY (tap to start), PLAYING, GAME_OVER (show score + best + “Press R or tap to restart”). On restart, reset RNG seed unless a fixed seed is set.

Input: Space / Up Arrow / click / touch all flap. In READY state, first flap starts the game. In GAME_OVER, click/tap restarts.

Determinism: implement a simple seeded RNG (LCG) and use it for pipe gap Y values; allow setting a const SEED = ... at top for repeatable runs.

Debug toggle (D): draw bird hitbox, pipe rectangles, and pipe gap center line.

Audio hooks: include stub functions playFlap(), playScore(), playHit() (no actual audio files required yet) so I can add assets later.

Code quality: keep constants at top; clean functions resetGame(), spawnPipePair(), update(dt), render(ctx), handleFlap(). Use requestAnimationFrame with a fixed timestep accumulator for stable physics.

Deliver complete working index.html and game.js that runs on GitHub Pages and locally via a simple static server.