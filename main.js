// 1. Initialise the game canvas
kaplay({
    width: 1280,
    height: 720,
    letterbox: true,      // Keeps the 16:9 TV ratio
    pixelGrid: false,     // <--- ADD THIS: Stops the "staircase" pixel effect
    texFilter: "linear",  // <--- ADD THIS: Smooths out Lumo's glow and the text
    background: [5, 5, 10], // Your deep dark navy/black
});

// 1. GLOBAL VARIABLES (At the very top of main.js)
let hitsTaken = 0;
let voltsEaten = 0;
const MAX_HITS = 3;
const totalVolts = 172;
let voltLabel;

// This is your master coordinate list. It's lightning-fast.
let wallMap = {};
let player = null;

// 2. Load your Figma Exports (Check your file names match exactly!)
loadSprite("lumo", "assets/lumo.png");
loadSprite("lumo_66", "assets/lumo_neutral.png"); // 66% - 34%
loadSprite("lumo_33", "assets/lumo_sad.png");     // 33% - 1%
loadSprite("lumo_0", "assets/lumo_dead.png");     // 0%
loadSprite("logo", "assets/logo.png");
loadSprite("brackets", "assets/bottom left border.png");
loadSprite("brackets", "assets/bottom right border.png");
loadSprite("brackets", "assets/top left border.png");
loadSprite("brackets", "assets/top right border.png");
loadSprite("volt", "assets/volt.png");

// Global Configuration
const TILE_SIZE = 48;
const X_OFFSET = 40;
const Y_OFFSET = 10;

// 3. Define the Intro Scene
scene("intro", () => {
    
    // Add the Corner Brackets
    add([
        sprite("brackets"),
        pos(0, 0),
        fixed(),
    ]);

    // Add the "Lumo" Title Logo
    add([
        sprite("logo"),
        pos(center().x, 150),
        anchor("center"),
    ]);

    // Add the Lumo Character
    const player = add([
        sprite("lumo"),
        pos(center()),
        anchor("center"),
    ]);

    // Add the [ Press space to initialise ] text
    const instruction = add([
        text("[ Press space to initialise ]", { size: 24, font: "monospace" }),
        pos(center().x, height() - 100),
        anchor("center"),
        color(255, 215, 0), // Your Gold color
    ]);

    // --- ANIMATIONS (The "1st Place" Polish) ---

    // Make Lumo "Pulse" (breathe)
    onUpdate(() => {
        player.scale = vec2(1 + wave(-0.03, 0.03, time() * 3));
    });

    // Make the instruction text blink
    loop(0.8, () => {
        instruction.hidden = !instruction.hidden;
    });

    // --- INPUT ---

    onKeyPress("space", () => {
        // This will eventually go to your maze game
        go("game"); 
    });
});


//let health = 100;


scene("game", () => {

    hitsTaken = 0;
    voltsEaten = 0;

    player = add([
        sprite("lumo"),
        pos(X_OFFSET + (1 * TILE_SIZE) + (TILE_SIZE / 2), 
            Y_OFFSET + (1 * TILE_SIZE) + (TILE_SIZE / 2)),
        anchor("center"),
        scale(0.15),
        area({ shape: new Rect(vec2(0), 16, 16) }),
        { isInvincible: false },
        body(),
        "lumo",
    ]);


    // Add this BEFORE addLevel()
    destroyAll("shadow");
    destroyAll("stalker");
    destroyAll("dot");
    destroyAll("fog");

    let playerDir = vec2(0, 0);

    // 1. PUT IT HERE (The Listener)
    onAdd("shadow", (s) => {
        wait(0.1, () => {
            const walls = get("wall");
            walls.forEach((w) => {
                if (s.isOverlapping(w)) { // isOverlapping is safer for spawn checks
                    s.pos.y += 12; 
                    s.pos.x += 12; 
                }
            });
        });
    });
    
    //let battery = 100
    
    // 1. THE ARCHITECTURE (25 columns x 15 rows)
    const MAP_LAYOUT = [
        "=========================", 
        "=   ........=...........=", // <--- Spawn at (1,1) is now empty!
        "=.====.====.=.====.====.=", 
        "=....=....=...=K...=....=", 
        "==.=.=.===.===.===.=.=.==", 
        "=..=.......=.......=..=.=", 
        "=.====.==.=====.==.====.=", 
        "=.......G   S   ........=", // Cleared the area around the Spawner too
        "=.====.==.=====.==.====.=", 
        "=..=.......=.......=..=.=", 
        "==.=.=.===.===.===.=.=.==", 
        "=....=....=...=....=....=", 
        "=.====.====.=.====.====.=", 
        "=...........=...........=", 
        "=========================", 
    ];

    
    let totalVolts = 0;
    MAP_LAYOUT.forEach((row) => {
        for (const char of row) {
            if (char === ".") totalVolts++;
        }
    });

    // 2. Initialize the player's current score
    let score = 0;

    // 3. Add the Score Label to the screen
    voltLabel = add([
        text(`VOLTAGE: 0 / ${totalVolts}`, { size: 24 }),
        pos(20, 20), // 20 pixels from the top-left of the SCREEN
        fixed(),     // This is the magic part—it ignores camera movement
        z(110),      // This ensures the text stays "on top" of the walls
    ]);

    // 1. The Black Background (The "Shell")
    add([
        rect(204, 24),
        pos(20, 100),
        color(50, 50, 50), // Dark grey
        fixed(), // Stays on screen when you move
        z(199),
    ]);

    // 2. The Actual Green Bar (This is what takeDamage talks to!)
    const batteryBar = add([
        rect(200, 20),
        pos(20, 100),
        color(0, 255, 0), // Start Green
        fixed(),
        z(200),
    ]);

    const batteryLabel = add([
        text("BATTERY: 100%", { size: 24 }),
        pos(width() - 250, 20), 
        fixed(),
        z(110), // Match the score depth
        color(0, 255, 0), 
    ]);


    function takeDamage() {
        if (player.isInvincible) return;
        
        player.isInvincible = true;
        hitsTaken++; 
        player.opacity = 0.5;

        // Calculate trinary percentage: 100, 66, 33, 0
        let displayPercent = hitsTaken === 0 ? 100 : hitsTaken === 1 ? 66 : hitsTaken === 2 ? 33 : 0;

        batteryBar.width = (displayPercent / 100) * 200;
        batteryLabel.text = `BATTERY: ${displayPercent}%`;

        if (hitsTaken === 1) {
            player.use(sprite("lumo_66"));
            batteryBar.color = rgb(255, 255, 0);
        } else if (hitsTaken === 2) {
            player.use(sprite("lumo_33"));
            batteryBar.color = rgb(255, 0, 0);
        } else if (hitsTaken >= MAX_HITS) {
            player.use(sprite("lumo_0"));
            batteryBar.width = 0;
            wait(0.8, () => go("lose_scene"));
            return;
        }

        wait(1.5, () => {
            player.isInvincible = false;
            player.opacity = 1;
        });
    }


    // 2. THE TRANSLATION LAYER (Building the world)
    const level = addLevel(MAP_LAYOUT, {
        tileWidth: 48,
        tileHeight: 48,
        pos: vec2(40, 10), // Positioned "Up" to avoid watermarks
        tiles: {                     
            "=": () => [
                rect(48, 48, { radius: 4 }),
                color(15, 15, 25),            // Dark Tech Wall
                outline(1, color(60, 60, 80)), // Subtle Border
                // We make the hitbox 50x50 and offset it by -1 to create a "Seal"
                area({ shape: new Rect(vec2(-1, -1), 50, 50) }), 
                body({ isStatic: true }),
                "wall",
            ],
            ".": () => [
                sprite("volt"),         // Your Figma Bolt
                pos(24, 24),            // Centered in tile
                anchor("center"),
                area(),
                "dot",
            ],

            "S": () => [
                rect(32, 32, { radius: 8 }),
                // Leave pos() empty like this; addLevel will inject the correct grid position automatically
                //body(),
                color(20, 20, 20),
                z(110),
                outline(2, Color.fromHex("#ff0000")),
                anchor("center"),
                pos(24,24),
                area({ shape: new Rect(vec2(0), 32, 32) }),
                "shadow",
                "enemy",
                {
                        targetPos: null,
                        lastDir: vec2(1, 0),
                        history: [], // Stores last 4 grid coordinates
                        commitSteps: 0,
                        speed: 120,
                        //paused: false,
                },
            {
                    draw() {
                        // Left Eye
                        drawRect({
                            width: 5,
                            height: 5,
                            pos: vec2(-8, -5),
                            color: rgb(255, 0, 0),
                            anchor: "center",
                        });
                // Right Eye
                        drawRect({
                            width: 5,
                            height: 5,
                            pos: vec2(8, -5),
                            color: rgb(255, 0, 0),
                            anchor: "center",
                        });
                    }
                }
            ], // No 'add' call, just the array brackets


            "G": () => [
                rect(32, 32),
                color(0, 255, 0), // Toxic Green
                z(110),
                pos(24,24),
                area({ shape: new Rect(vec2(0), 40, 40) }),
                "glitchy",
                "enemy",
                {
                    targetPos: null,
                    lastDir: vec2(1, 0),
                    speed: 250, // Absolute chaotic speed
                    //paused: false,
                },
                {
                    draw() {
                        // Jittery Glitch Effect
                        if (chance(0.2)) {
                            drawRect({
                                width: 40,
                                height: 5,
                                pos: vec2(rand(-10, 10), rand(-10, 10)),
                                color: rgb(255, 255, 255),
                                opacity: 0.5,
                            });
                        }
                    }
                }
            ],

            "K": () => [
                rect(24, 24, { radius: 12 }), // Circular-ish ghost
                color(180, 180, 255), // Cold blue/grey ghost color
                outline(2, rgb(255, 255, 255)),
                z(110), 
                opacity(0), // STARTS INVISIBLE
                area(),
                "stalker",
                {
                    active: false,
                    lastAttack: 0,
                    speed: 400, // Faster than Lumo, but only in short bursts
                    //paused: false,
                }
            ],
        },
    });

    const wallMap = {};
    level.get("wall").forEach((w) => {
        const gx = Math.round((w.pos.x - 40) / 48);
        const gy = Math.round((w.pos.y - 10) / 48);
        wallMap[`${gx},${gy}`] = true;
});


console.log("Global playerRef check:", player);


    function canMoveTo(p) {
        // 1. Convert Lumo's pixel position to Grid Coordinates
        const gridX = Math.floor((p.x - X_OFFSET) / TILE_SIZE);
        const gridY = Math.floor((p.y - Y_OFFSET) / TILE_SIZE);
    
        // 2. Check the MAP_LAYOUT string directly
        const row = MAP_LAYOUT[gridY];
        if (!row) return false;
        const tile = row[gridX];
    
        // 3. If the tile is a wall ("="), return FALSE (Movement Denied)
        return tile !== "=";
    }

    // 1. Direction state (Outside the loop)
    const SPEED = 160;

    // 2. The Steering Wheel (Keep these!)
    onKeyDown("left", () => { playerDir = vec2(-1, 0); });
    onKeyDown("right", () => { playerDir = vec2(1, 0); });
    onKeyDown("up", () => { playerDir = vec2(0, -1); });
    onKeyDown("down", () => { playerDir = vec2(0, 1); });

    // 3. The Engine (Predictive onUpdate)
    onUpdate(() => {
        if (playerDir.x === 0 && playerDir.y === 0) return;
    
        // 1. Predict where Lumo wants to go (check slightly ahead by 20px)
        const checkDist = 20;
        const futurePos = player.pos.add(playerDir.scale(checkDist));
    
        // 2. The Border Guard check
        if (canMoveTo(futurePos)) {
            player.move(playerDir.scale(SPEED));
        } else {
            // Impact! Stop immediately.
            playerDir = vec2(0, 0);
        }
    
        // 3. Keep him perfectly centered so he doesn't "touch" the black lines
        if (playerDir.x !== 0) {
            player.pos.y = lerp(player.pos.y, Math.round((player.pos.y - Y_OFFSET - 24) / 48) * 48 + Y_OFFSET + 24, 0.4);
        }
        if (playerDir.y !== 0) {
            player.pos.x = lerp(player.pos.x, Math.round((player.pos.x - X_OFFSET - 24) / 48) * 48 + X_OFFSET + 24, 0.4);
        }

        camPos(player.pos);
    });

    player.onCollide("dot", (d) => {
        destroy(d);
        voltsEaten++;

        // DIRECT UPDATE: No 'if' statements or 'get()' needed
        if (voltLabel) {
            voltLabel.text = `VOLTAGE: ${voltsEaten} / 172`;
        }

        // 1. STABILIZED MATH (The LERP)
        // We ensure progress never exceeds 1.0
        const progress = Math.min(voltsEaten / totalVolts, 1);
        
        // 2. SMOOTH GROWTH
        // We only update the light if the fog still exists
        if (fog) { 
            const targetLight = 80 + (progress * 1120);
            fog.lightFocus = lerp(fog.lightFocus, targetLight, 0.1); 
        }

        // --- THE WIN CONDITION ---
        if (voltsEaten >= totalVolts) {
            // Massive light burst before winning
            if (fog) fog.lightFocus = 4000; 
            
            wait(0.5, () => {
                go("win_scene");
            });
        }
    });

    onUpdate("shadow", (s) => {
        // --- 1. THE CRASH BARRIER ---
        // If the player isn't loaded or the map is still building, we exit.
        // This is what fixed your "9 Object" limit.
        if (!player || !s.history) return;
        if (s.paused) return;

        const TILE = 48;
        const OX = 40; 
        const OY = 10;

        // Initialize target position if it's the first frame
        if (!s.targetPos) s.targetPos = s.pos;

        // --- 2. SLIDE ANIMATION ---
        // If we haven't reached the next tile yet, keep moving toward it.
        if (s.pos.dist(s.targetPos) > 2) {
            s.moveTo(s.targetPos, s.speed);
            return; 
        }

        // --- 3. GRID SNAPPING & MEMORY ---
        // Snap to the exact pixel center of the tile before "thinking."
        s.pos = s.targetPos; 

        const gx = Math.round((s.pos.x - OX - 24) / TILE);
        const gy = Math.round((s.pos.y - OY - 24) / TILE);
        
        // Player grid position (adjusted for Lumo's sprite offset)
        const px = Math.round((player.pos.x - OX - 24) / TILE);
        const py = Math.round((player.pos.y - OY - 34) / TILE); 
        
        // Store current tile in history to discourage looping (Max 10 tiles)
        const currentCoord = `${gx},${gy}`;
        if (!s.history.includes(currentCoord)) {
            s.history.push(currentCoord);
            if (s.history.length > 10) s.history.shift();
        }

        // --- 4. LINE OF SIGHT (LOS) ---
        let canSeePlayer = false;
        if (gx === px || gy === py) {
            canSeePlayer = true;
            const minX = Math.min(gx, px), maxX = Math.max(gx, px);
            const minY = Math.min(gy, py), maxY = Math.max(gy, py);

            if (gx === px) {
                for (let y = minY; y <= maxY; y++) {
                    if (wallMap[`${gx},${y}`]) { canSeePlayer = false; break; }
                }
            } else {
                for (let x = minX; x <= maxX; x++) {
                    if (wallMap[`${x},${gy}`]) { canSeePlayer = false; break; }
                }
            }
        }

        // --- 5. THE "ACUTE HUNTER" PATHFINDING ---
        const dirs = [vec2(1,0), vec2(-1,0), vec2(0,1), vec2(0,-1)];
        
        // Check which adjacent tiles are NOT walls
        let validPaths = dirs.filter(d => !wallMap[`${gx + d.x},${gy + d.y}`]);

        if (validPaths.length > 0) {
            validPaths.sort((a, b) => {
                const getScore = (dir) => {
                    const nt = vec2(gx + dir.x, gy + dir.y);
                    const wn = vec2(nt.x * TILE + OX + 24, nt.y * TILE + OY + 24);
                    
                    // Base Score: How far is this tile from Lumo?
                    const dF = wn.dist(player.pos);
                    
                    // Priority 1: Direct Line of Sight (Chase mode)
                    if (canSeePlayer) return dF; 

                    // Priority 2: U-Turn Penalty (1500)
                    // Stops him from vibrating back and forth in a hallway.
                    const uP = (s.lastDir && dir.dot(s.lastDir) === -1) ? 1500 : 0;

                    // Priority 3: History Penalty (200)
                    // Slight discouragement from going back where he just was.
                    const hP = s.history.includes(`${nt.x},${nt.y}`) ? 200 : 0;

                    // Priority 4: Intersection Sensitivity (0)
                    // We removed the "Forward Bias" so he treats turns and straight 
                    // paths equally. He will always pick the one that is closer to you.
                    const fwdB = 0; 
                    
                    return dF + uP + hP + fwdB;
                };
                return getScore(a) - getScore(b);
            });

            // Pick the best direction and set the new target
            s.lastDir = validPaths[0];
            s.targetPos = s.pos.add(s.lastDir.scale(TILE));
        }
    });

    onUpdate("glitchy", (g) => {
        if (g.paused) return;
        const TILE = 48, OX = 40, OY = 10;
        
        if (!g.targetPos) g.targetPos = g.pos;

        // 1. HIGH-SPEED GLIDE
        g.moveTo(g.targetPos, g.speed);

        // 2. THE NAVIGATION BRAIN (Only at Tile Center)
        if (g.pos.dist(g.targetPos) < 4) {
            g.pos = g.targetPos;

            const gx = Math.round((g.pos.x - OX - 24) / TILE);
            const gy = Math.round((g.pos.y - OY - 24) / TILE);

            const dirs = [vec2(1,0), vec2(-1,0), vec2(0,1), vec2(0,-1)];
            
            // Find ALL available paths (No walls)
            let available = dirs.filter(d => !wallMap[`${gx + d.x},${gy + d.y}`]);

            if (available.length > 0) {
                // THE ANTI-BOUNCE FILTER:
                // Try to find paths that AREN'T the way he just came from (U-turn)
                let forwardPaths = available.filter(d => {
                    // If he has a lastDir, check if 'd' is the opposite of it
                    return g.lastDir ? d.dot(g.lastDir) !== -1 : true;
                });

                // DECISION:
                if (forwardPaths.length > 0) {
                    // 90% chance to keep moving forward/turning
                    // 10% chance to allow a U-turn (keeps him unpredictable)
                    g.lastDir = chance(0.9) ? choose(forwardPaths) : choose(available);
                } else {
                    // DEAD END: He has no choice but to U-turn
                    g.lastDir = choose(available);
                }

                g.targetPos = g.pos.add(g.lastDir.scale(TILE));
            }
        g.opacity = wave(0.2, 1, time() * 20);
        }
    });
        // Add this inside the onUpdate("glitchy")

    // Add the Fog Layer
    // 1. Give your player and enemies a lower Z-index
    // Make sure Shadow and Glitchy have z(50) in their component list.

    // 1. CREATE THE FOG OBJECT
    const fog = add([
        "fog",
        z(100), // Ensure this is BELOW Shadow (110) but ABOVE everything else
        {
            lightFocus: 80, // Starting radius
        }
    ]);

    // 2. THE PERFORMANCE-OPTIMIZED DRAW LOOP
    fog.onDraw(() => {
        if (!player) return;

        const sw = width();
        const sh = height();
        const p = player.pos;

        // --- SAFETY CHECK ---
        // If voltsEaten math breaks, this keeps the game at 60fps
        let r = fog.lightFocus;
        if (isNaN(r) || r < 10) r = 80; 
        if (r > 2000) r = 2000;

        // --- DRAW THE 4 COVER STRIPS ---
        // We only draw exactly what is needed to fill the screen around the player.
        
        // TOP STRIP
        drawRect({
            width: sw,
            height: Math.max(0, p.y - r),
            pos: vec2(0, 0),
            color: rgb(0, 0, 0),
        });

        // BOTTOM STRIP
        drawRect({
            width: sw,
            height: Math.max(0, sh - (p.y + r)),
            pos: vec2(0, Math.min(sh, p.y + r)),
            color: rgb(0, 0, 0),
        });

        // LEFT STRIP (Fills the gap between top and bottom)
        drawRect({
            width: Math.max(0, p.x - r),
            height: Math.min(sh, r * 2),
            pos: vec2(0, Math.max(0, p.y - r)),
            color: rgb(0, 0, 0),
        });

        // RIGHT STRIP
        drawRect({
            width: Math.max(0, sw - (p.x + r)),
            height: Math.min(sh, r * 2),
            pos: vec2(Math.min(sw, p.x + r), Math.max(0, p.y - r)),
            color: rgb(0, 0, 0),
        });
    });

    // 3. THE SMOOTHING ENGINE
    fog.onUpdate(() => {
        // 1. STARTING SIZE: 120 (Tense)
        // 2. MAX SIZE: 350 (Enough to see the next turn, but still spooky)
        const minSize = 120;
        const maxSize = 350; 
        
        // This math makes the light grow slowly but cap out at 350px
        const progress = Math.min(voltsEaten / totalVolts, 1);
        const targetSize = minSize + (progress * (maxSize - minSize));
        
        // Smooth transition
        fog.lightFocus = lerp(fog.lightFocus, targetSize, 0.05);

        // WIN FLASH: Still keep the big flash for the ending!
        if (voltsEaten >= 171) {
            fog.lightFocus = lerp(fog.lightFocus, 3000, 0.02); 
        }
    });

    onUpdate("stalker", (k) => {
        if (k.paused) return;
        if (!player) return;

        const distToPlayer = k.pos.dist(player.pos);
        const currentTime = time();

        // 1. RECHARGE PHASE (Stay away while cooling down)
        if (currentTime - k.lastAttack < 4) {
            k.opacity = 0;
            k.active = false;
            return; 
        }

        // 2. LUNGE PHASE (The Attack)
        if (k.active) {
            k.opacity = 1;
            k.move(player.pos.sub(k.pos).unit().scale(k.speed));

            // --- THE "MANUAL" COLLISION ---
            // If distance is less than 30 pixels, it's a HIT
            if (distToPlayer < 30) {
                console.log("STALKER GOT YOU!"); 
                takeDamage(); 
                shake(15);
                
                // Post-hit Reset
                k.active = false;
                k.lastAttack = currentTime;
                k.pos = vec2(rand(100, width()-100), rand(100, height()-100));
            }

            // Give up if Lumo is too fast
            if (distToPlayer > 500) {
                k.active = false;
                k.lastAttack = currentTime;
            }
            return;
        }

        // 3. STEALTH PHASE (The Trap)
        if (distToPlayer < 120) {
            k.active = true;
            // Optional: Add a "Surprise" sound here
        }
    });

    // This one block handles Shadow AND Glitchy AND anyone else with the "enemy" tag
    // 1. Shadow & Glitchy (The "Enemy" tag)
    player.onCollide("enemy", (enemy) => {
        takeDamage();
        
        // REDUCED FORCE: Change 2000 to a tiny 50px nudge
        // This stops the "Ejection" bug completely
        const pushDir = player.pos.sub(enemy.pos).unit();
        player.move(pushDir.scale(50)); 
    });

}); // End of scene("game")


// --- THE GAME OVER SCENE ---
scene("lose_scene", () => {
    
    // 1. Dark background
    add([
        rect(width(), height()),
        color(0, 0, 0),
    ]);

    // 2. The Dead Lumo Sprite
    add([
        sprite("lumo_0"),
        pos(center().x, center().y - 50),
        anchor("center"),
        scale(0.3), // Slightly bigger for the dramatic finish
    ]);

    // 3. Glowing "GAME OVER" Text
    const gameOverText = add([
        text("GAME OVER", {
            size: 80,
            font: "monospace",
            letterSpacing: 10,
        }),
        pos(center().x, center().y + 80),
        anchor("center"),
        color(255, 0, 0), // Deep Red
        area(),
    ]);

    // Add a glowing "Pulse" effect to the red text
    onUpdate(() => {
        gameOverText.opacity = wave(0.4, 1, time() * 4);
        // Subtle shake for the text only
        gameOverText.pos.x = center().x + rand(-1, 1);
    });

    // 4. Restart Instruction
    add([
        text("[ Press R to Reboot ]", { size: 24, font: "monospace" }),
        pos(center().x, height() - 100),
        anchor("center"),
        color(200, 200, 200),
    ]);

    // --- RESTART LOGIC ---
    onKeyPress("r", () => {
        // Reset all your global game variables before starting over
        voltsEaten = 0;
        hitsTaken = 0;
        go("game"); 
    });

});


scene("win_scene", () => {
    // 1. Deep Forest/Tech Green Background
    add([
        rect(width(), height()),
        color(0, 20, 0), // Very dark green base
    ]);

    // 2. The Winner Sprite
    add([
        sprite("lumo"),
        pos(center().x, center().y - 80),
        anchor("center"),
        scale(0.4),
    ]);

    // 3. Victory Text (Matrix/Terminal Green)
    add([
        text("SYSTEM RECHARGED", {
            size: 60,
            font: "monospace",
            letterSpacing: 8,
        }),
        pos(center().x, center().y + 50),
        anchor("center"),
        color(0, 255, 100), // Bright Spring Green
    ]);

    add([
        text("ALL VOLTAGE SECURED // ENEMY NEUTRALISED", { size: 18, font: "monospace" }),
        pos(center().x, center().y + 110),
        anchor("center"),
        color(200, 255, 200), // Soft Mint Green
    ]);

    // 4. Play Again
    const restartBtn = add([
        text("[ Press SPACE to Reboot ]", { size: 24, font: "monospace" }),
        pos(center().x, height() - 100),
        anchor("center"),
        color(255, 255, 255),
    ]);

    onUpdate(() => {
        restartBtn.opacity = wave(0.3, 1, time() * 3);
    });

    onKeyPress("space", () => {
        voltsEaten = 0;
        hitsTaken = 0;
        go("game");
    });
});

// 5. Start the game at the Intro
go("intro");


// 1. We manually calculate the position: (Column * TileWidth) + MazeOffset
const startX = 40 + (1 * 48) + 24; // 40 (offset) + (1 * 48px) + 24 (half-tile to center Lumo)
const startY = 40 + (1 * 48) + 24;