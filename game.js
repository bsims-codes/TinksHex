// ============================================
// CONSTANTS
// ============================================
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;

// Bird constants
const BIRD_START_X = 200;
const BIRD_START_Y = 300;
const BIRD_WIDTH = 50;
const BIRD_HEIGHT = 35;
const BIRD_HITBOX_WIDTH = 34;
const BIRD_HITBOX_HEIGHT = 24;
const GRAVITY = 2000; // px/s²
const FLAP_VELOCITY = -520; // px/s
const MAX_FALL_SPEED = 900; // px/s

// Pipe constants
const PIPE_WIDTH = 90;
const PIPE_GAP = 170;
const PIPE_SPAWN_INTERVAL = 1.35; // seconds
const PIPE_SPEED = 240; // px/s
const GAP_MIN_Y = 120;
const GAP_MAX_Y = 480;

// Ground and ceiling
const GROUND_Y = 540;
const CEILING_Y = 0;

// Seeded RNG - change this for repeatable runs
const SEED = null; // Set to a number for deterministic runs, null for random

// ============================================
// SEEDED RNG (LCG)
// ============================================
let rngState;

function initRNG(seed) {
    if (seed !== null) {
        rngState = seed;
    } else {
        rngState = Date.now() % 2147483647;
    }
}

function seededRandom() {
    // LCG parameters (same as glibc)
    rngState = (rngState * 1103515245 + 12345) % 2147483648;
    return rngState / 2147483648;
}

function randomInRange(min, max) {
    return min + seededRandom() * (max - min);
}

// ============================================
// ASSET MANAGER
// ============================================
const AssetManager = {
    sprites: {},

    // Register a sprite (for future use with actual images)
    register(name, image) {
        this.sprites[name] = image;
    },

    // Draw a sprite - currently draws shapes, can be swapped for images later
    drawSprite(ctx, name, x, y, w, h, opts = {}) {
        const { rotation = 0, color = '#FFF', secondaryColor = null } = opts;

        ctx.save();
        ctx.translate(x + w / 2, y + h / 2);
        ctx.rotate(rotation);
        ctx.translate(-w / 2, -h / 2);

        switch (name) {
            case 'bird':
                this.drawBird(ctx, 0, 0, w, h, opts);
                break;
            case 'pipe_top':
                this.drawPipe(ctx, 0, 0, w, h, true);
                break;
            case 'pipe_bottom':
                this.drawPipe(ctx, 0, 0, w, h, false);
                break;
            case 'ground':
                this.drawGround(ctx, 0, 0, w, h);
                break;
            default:
                ctx.fillStyle = color;
                ctx.fillRect(0, 0, w, h);
        }

        ctx.restore();
    },

    drawBird(ctx, x, y, w, h, opts) {
        // Body
        ctx.fillStyle = '#F7DC6F';
        ctx.beginPath();
        ctx.ellipse(x + w / 2, y + h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
        ctx.fill();

        // Wing
        ctx.fillStyle = '#F4D03F';
        ctx.beginPath();
        ctx.ellipse(x + w * 0.35, y + h * 0.55, w * 0.25, h * 0.3, -0.3, 0, Math.PI * 2);
        ctx.fill();

        // Eye
        ctx.fillStyle = '#FFF';
        ctx.beginPath();
        ctx.arc(x + w * 0.7, y + h * 0.35, h * 0.2, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#000';
        ctx.beginPath();
        ctx.arc(x + w * 0.73, y + h * 0.35, h * 0.1, 0, Math.PI * 2);
        ctx.fill();

        // Beak
        ctx.fillStyle = '#E74C3C';
        ctx.beginPath();
        ctx.moveTo(x + w * 0.85, y + h * 0.45);
        ctx.lineTo(x + w + 10, y + h * 0.5);
        ctx.lineTo(x + w * 0.85, y + h * 0.6);
        ctx.closePath();
        ctx.fill();
    },

    drawPipe(ctx, x, y, w, h, isTop) {
        // Main pipe body
        ctx.fillStyle = '#2ECC71';
        ctx.fillRect(x, y, w, h);

        // Pipe highlight
        ctx.fillStyle = '#27AE60';
        ctx.fillRect(x + w * 0.1, y, w * 0.15, h);

        // Pipe shadow
        ctx.fillStyle = '#1E8449';
        ctx.fillRect(x + w * 0.75, y, w * 0.15, h);

        // Pipe lip
        const lipHeight = 30;
        const lipOverhang = 8;
        ctx.fillStyle = '#2ECC71';
        if (isTop) {
            ctx.fillRect(x - lipOverhang, y + h - lipHeight, w + lipOverhang * 2, lipHeight);
            ctx.fillStyle = '#27AE60';
            ctx.fillRect(x - lipOverhang, y + h - lipHeight, w * 0.15 + lipOverhang, lipHeight);
        } else {
            ctx.fillRect(x - lipOverhang, y, w + lipOverhang * 2, lipHeight);
            ctx.fillStyle = '#27AE60';
            ctx.fillRect(x - lipOverhang, y, w * 0.15 + lipOverhang, lipHeight);
        }
    },

    drawGround(ctx, x, y, w, h) {
        // Dirt
        ctx.fillStyle = '#D4A574';
        ctx.fillRect(x, y, w, h);

        // Grass on top
        ctx.fillStyle = '#7CB342';
        ctx.fillRect(x, y, w, 15);
    }
};

// ============================================
// AUDIO STUBS
// ============================================
function playFlap() {
    // Audio stub - implement when audio assets are available
}

function playScore() {
    // Audio stub - implement when audio assets are available
}

function playHit() {
    // Audio stub - implement when audio assets are available
}

// ============================================
// GAME STATE
// ============================================
const GameState = {
    READY: 'READY',
    PLAYING: 'PLAYING',
    GAME_OVER: 'GAME_OVER'
};

let state = GameState.READY;
let debugMode = false;

// Bird state
let bird = {
    x: BIRD_START_X,
    y: BIRD_START_Y,
    vy: 0,
    rotation: 0
};

// Pipes
let pipes = [];
let pipeTimer = 0;

// Score
let score = 0;
let bestScore = parseInt(localStorage.getItem('flappyBestScore')) || 0;

// ============================================
// GAME FUNCTIONS
// ============================================
function resetGame() {
    bird.x = BIRD_START_X;
    bird.y = BIRD_START_Y;
    bird.vy = 0;
    bird.rotation = 0;

    pipes = [];
    pipeTimer = 0;
    score = 0;

    // Reset RNG unless fixed seed
    if (SEED === null) {
        initRNG(null);
    }

    state = GameState.READY;
}

function spawnPipePair() {
    const gapCenterY = randomInRange(GAP_MIN_Y, GAP_MAX_Y);

    const topPipeHeight = gapCenterY - PIPE_GAP / 2;
    const bottomPipeY = gapCenterY + PIPE_GAP / 2;
    const bottomPipeHeight = CANVAS_HEIGHT - bottomPipeY;

    pipes.push({
        x: CANVAS_WIDTH,
        gapCenterY: gapCenterY,
        topHeight: topPipeHeight,
        bottomY: bottomPipeY,
        bottomHeight: bottomPipeHeight,
        scored: false
    });
}

function handleFlap() {
    if (state === GameState.READY) {
        state = GameState.PLAYING;
        bird.vy = FLAP_VELOCITY;
        playFlap();
    } else if (state === GameState.PLAYING) {
        bird.vy = FLAP_VELOCITY;
        playFlap();
    } else if (state === GameState.GAME_OVER) {
        resetGame();
    }
}

function getBirdHitbox() {
    return {
        x: bird.x + (BIRD_WIDTH - BIRD_HITBOX_WIDTH) / 2,
        y: bird.y + (BIRD_HEIGHT - BIRD_HITBOX_HEIGHT) / 2,
        width: BIRD_HITBOX_WIDTH,
        height: BIRD_HITBOX_HEIGHT
    };
}

function checkAABBCollision(rect1, rect2) {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
}

function update(dt) {
    if (state !== GameState.PLAYING) return;

    // Update bird physics
    bird.vy += GRAVITY * dt;
    if (bird.vy > MAX_FALL_SPEED) {
        bird.vy = MAX_FALL_SPEED;
    }
    bird.y += bird.vy * dt;

    // Bird rotation based on velocity (visual only)
    const targetRotation = Math.min(Math.max(bird.vy / 500, -0.5), 1.2);
    bird.rotation = targetRotation;

    // Check ceiling/ground collision
    if (bird.y <= CEILING_Y || bird.y + BIRD_HEIGHT >= GROUND_Y) {
        playHit();
        state = GameState.GAME_OVER;
        if (score > bestScore) {
            bestScore = score;
            localStorage.setItem('flappyBestScore', bestScore.toString());
        }
        return;
    }

    // Spawn pipes
    pipeTimer += dt;
    if (pipeTimer >= PIPE_SPAWN_INTERVAL) {
        spawnPipePair();
        pipeTimer -= PIPE_SPAWN_INTERVAL;
    }

    // Update pipes
    const birdHitbox = getBirdHitbox();

    for (let i = pipes.length - 1; i >= 0; i--) {
        const pipe = pipes[i];
        pipe.x -= PIPE_SPEED * dt;

        // Remove off-screen pipes
        if (pipe.x + PIPE_WIDTH < 0) {
            pipes.splice(i, 1);
            continue;
        }

        // Check for score
        const pipeCenterX = pipe.x + PIPE_WIDTH / 2;
        if (!pipe.scored && bird.x > pipeCenterX) {
            pipe.scored = true;
            score++;
            playScore();
        }

        // Check collision with top pipe
        const topPipeRect = {
            x: pipe.x,
            y: 0,
            width: PIPE_WIDTH,
            height: pipe.topHeight
        };

        // Check collision with bottom pipe
        const bottomPipeRect = {
            x: pipe.x,
            y: pipe.bottomY,
            width: PIPE_WIDTH,
            height: pipe.bottomHeight
        };

        if (checkAABBCollision(birdHitbox, topPipeRect) ||
            checkAABBCollision(birdHitbox, bottomPipeRect)) {
            playHit();
            state = GameState.GAME_OVER;
            if (score > bestScore) {
                bestScore = score;
                localStorage.setItem('flappyBestScore', bestScore.toString());
            }
            return;
        }
    }
}

function render(ctx) {
    // Clear canvas with sky color
    ctx.fillStyle = '#70C5CE';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Draw pipes
    for (const pipe of pipes) {
        // Top pipe
        AssetManager.drawSprite(ctx, 'pipe_top', pipe.x, 0, PIPE_WIDTH, pipe.topHeight);

        // Bottom pipe
        AssetManager.drawSprite(ctx, 'pipe_bottom', pipe.x, pipe.bottomY, PIPE_WIDTH, pipe.bottomHeight);

        // Debug: draw pipe gap center line
        if (debugMode) {
            ctx.strokeStyle = '#FF0000';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(pipe.x, pipe.gapCenterY);
            ctx.lineTo(pipe.x + PIPE_WIDTH, pipe.gapCenterY);
            ctx.stroke();

            // Draw pipe hitboxes
            ctx.strokeStyle = '#FF00FF';
            ctx.lineWidth = 1;
            ctx.strokeRect(pipe.x, 0, PIPE_WIDTH, pipe.topHeight);
            ctx.strokeRect(pipe.x, pipe.bottomY, PIPE_WIDTH, pipe.bottomHeight);
        }
    }

    // Draw ground
    AssetManager.drawSprite(ctx, 'ground', 0, GROUND_Y, CANVAS_WIDTH, CANVAS_HEIGHT - GROUND_Y);

    // Draw bird
    AssetManager.drawSprite(ctx, 'bird', bird.x, bird.y, BIRD_WIDTH, BIRD_HEIGHT, {
        rotation: bird.rotation
    });

    // Debug: draw bird hitbox
    if (debugMode) {
        const hitbox = getBirdHitbox();
        ctx.strokeStyle = '#00FF00';
        ctx.lineWidth = 2;
        ctx.strokeRect(hitbox.x, hitbox.y, hitbox.width, hitbox.height);
    }

    // Draw score
    ctx.fillStyle = '#FFF';
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 3;
    ctx.font = 'bold 48px Arial';
    ctx.textAlign = 'center';
    ctx.strokeText(score.toString(), CANVAS_WIDTH / 2, 60);
    ctx.fillText(score.toString(), CANVAS_WIDTH / 2, 60);

    // Draw best score
    ctx.font = 'bold 20px Arial';
    ctx.strokeText(`Best: ${bestScore}`, CANVAS_WIDTH / 2, 90);
    ctx.fillText(`Best: ${bestScore}`, CANVAS_WIDTH / 2, 90);

    // State-specific UI
    if (state === GameState.READY) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        ctx.fillStyle = '#FFF';
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 4;
        ctx.font = 'bold 64px Arial';
        ctx.textAlign = 'center';
        ctx.strokeText('FLAPPY BIRD', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 50);
        ctx.fillText('FLAPPY BIRD', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 50);

        ctx.font = 'bold 28px Arial';
        ctx.strokeText('Tap, Click, or Press Space to Start', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 20);
        ctx.fillText('Tap, Click, or Press Space to Start', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 20);

        ctx.font = '18px Arial';
        ctx.lineWidth = 2;
        ctx.strokeText('Press D for Debug Mode', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 60);
        ctx.fillText('Press D for Debug Mode', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 60);
    } else if (state === GameState.GAME_OVER) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

        ctx.fillStyle = '#FFF';
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 4;
        ctx.font = 'bold 64px Arial';
        ctx.textAlign = 'center';
        ctx.strokeText('GAME OVER', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 80);
        ctx.fillText('GAME OVER', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 80);

        ctx.font = 'bold 36px Arial';
        ctx.strokeText(`Score: ${score}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 10);
        ctx.fillText(`Score: ${score}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 10);

        ctx.strokeText(`Best: ${bestScore}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 40);
        ctx.fillText(`Best: ${bestScore}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 40);

        ctx.font = 'bold 24px Arial';
        ctx.strokeText('Press R or Tap to Restart', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 100);
        ctx.fillText('Press R or Tap to Restart', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 100);
    }

    // Debug mode indicator
    if (debugMode) {
        ctx.fillStyle = '#FF0';
        ctx.font = 'bold 16px Arial';
        ctx.textAlign = 'left';
        ctx.fillText('DEBUG MODE', 10, 25);
    }
}

// ============================================
// INPUT HANDLING
// ============================================
function setupInput() {
    // Keyboard
    document.addEventListener('keydown', (e) => {
        if (e.code === 'Space' || e.code === 'ArrowUp') {
            e.preventDefault();
            handleFlap();
        } else if (e.code === 'KeyR' && state === GameState.GAME_OVER) {
            resetGame();
        } else if (e.code === 'KeyD') {
            debugMode = !debugMode;
        }
    });

    // Mouse click
    const canvas = document.getElementById('gameCanvas');
    canvas.addEventListener('click', (e) => {
        e.preventDefault();
        handleFlap();
    });

    // Touch
    canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        handleFlap();
    });
}

// ============================================
// GAME LOOP
// ============================================
const FIXED_TIMESTEP = 1 / 60; // 60 FPS physics
let accumulator = 0;
let lastTime = 0;

function gameLoop(currentTime) {
    const dt = (currentTime - lastTime) / 1000;
    lastTime = currentTime;

    // Prevent spiral of death
    const frameDt = Math.min(dt, 0.25);
    accumulator += frameDt;

    // Fixed timestep updates
    while (accumulator >= FIXED_TIMESTEP) {
        update(FIXED_TIMESTEP);
        accumulator -= FIXED_TIMESTEP;
    }

    // Render
    const canvas = document.getElementById('gameCanvas');
    const ctx = canvas.getContext('2d');
    render(ctx);

    requestAnimationFrame(gameLoop);
}

// ============================================
// INITIALIZATION
// ============================================
function init() {
    initRNG(SEED);
    setupInput();
    lastTime = performance.now();
    requestAnimationFrame(gameLoop);
}

// Start the game when the page loads
window.addEventListener('load', init);
