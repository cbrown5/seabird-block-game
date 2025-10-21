// Game configuration
const CONFIG = {
    INITIAL_FISH_COUNT: 100,
    GAME_DURATION: 300, // 5 minutes in seconds
    PLAYER_SPEED: 3,
    JELLYFISH_SPEED: 1,
    PREDATOR_SPEED: 1.5, // Reduced from direct targeting to slower pursuit
    PREDATOR_DETECTION_RANGE: 150, // Predators only hunt when fish are within this distance
    INITIAL_JELLYFISH_COUNT: 2, // Start with fewer jellyfish
    MAX_JELLYFISH_COUNT: 12, // Maximum jellyfish count
    MAX_PREDATOR_COUNT: 5, // Maximum predators (start with 0)
    PLANKTON_COUNT: 15,
    FISH_SIZE: 3,
    SCHOOL_SPREAD: 200,
    SCHOOL_CLUSTER_SPREAD: 0.2, // Controls how clustered fish are (0-1, lower = more spread)
    HUNGER_RATE: 10, // Hunger increases per second
    HUNGER_MAX: 100,
    PLANKTON_NUTRITION: 30,
    COLLISION_DAMAGE: 5, // Fish lost per collision
    STARVATION_DAMAGE: 1, // Fish lost per second when starving
};

class Game {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        this.resizeCanvas();
        
        // Game state
        this.running = false;
        this.fishCount = CONFIG.INITIAL_FISH_COUNT;
        this.timeRemaining = CONFIG.GAME_DURATION;
        this.hunger = 0;
        this.elapsedTime = 0; // Track elapsed time for progressive difficulty
        
        // Player
        this.player = {
            x: this.canvas.width / 2,
            y: this.canvas.height / 2,
            vx: 0,
            vy: 0,
            fishPositions: [] // Positions of individual fish in the school
        };
        
        // Entities
        this.jellyfish = [];
        this.predators = [];
        this.plankton = [];
        
        // Input
        this.keys = {};
        
        // Animation
        this.lastTime = 0;
        this.animationId = null;
        
        // Sound effects
        this.audioInitialized = false;
        this.sounds = this.initSounds();
        
        // Victory animation state (happy fish that swims away)
        this.victoryAnimation = {
            active: false,
            fish: null,   // { x, y, vx, vy, size, tailPhase, bobPhase }
            rafId: null,
            lastTime: 0,
            // Added message state
            message: null // { text, age, duration, opacity }
        };
        
        // Add an audio prompt overlay
        this.createAudioPrompt();
        
        this.init();
    }
    
    resizeCanvas() {
        const rect = this.canvas.getBoundingClientRect();
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
    }
    
    createAudioPrompt() {
        // Create audio prompt overlay
        const audioPrompt = document.createElement('div');
        audioPrompt.id = 'audio-prompt';
        audioPrompt.style.position = 'absolute';
        audioPrompt.style.top = '0';
        audioPrompt.style.left = '0';
        audioPrompt.style.width = '100%';
        audioPrompt.style.height = '100%';
        audioPrompt.style.backgroundColor = 'rgba(0,0,0,0.7)';
        audioPrompt.style.color = 'white';
        audioPrompt.style.display = 'flex';
        audioPrompt.style.flexDirection = 'column';
        audioPrompt.style.justifyContent = 'center';
        audioPrompt.style.alignItems = 'center';
        audioPrompt.style.zIndex = '1000';
        audioPrompt.style.cursor = 'pointer';
        audioPrompt.innerHTML = `
            <h2>Click to Start Game</h2>
            <p> The aim is to survive with at least on larva left after 5 minutes.</p>
            <p> Use arrow keys to avoid predators and collect plankton to avoid starving.</p>
            <button id="enable-audio-btn" style="padding: 10px 20px; font-size: 18px; margin-top: 20px;">Start </button>
        `;
        document.body.appendChild(audioPrompt);
        
        // Add click event to enable audio
        document.getElementById('enable-audio-btn').addEventListener('click', () => {
            this.unlockAudio().then(() => {
                audioPrompt.style.display = 'none';
                this.start();
            });
        });
    }
    
    unlockAudio() {
        return new Promise(async (resolve) => {
            // Create and play a short sound to unlock audio
            try {
                await this.sounds.ensureAudioCtx();
                
                // Play a silent sound to fully unlock audio
                const audioCtx = await this.sounds.ensureAudioCtx();
                const oscillator = audioCtx.createOscillator();
                const gainNode = audioCtx.createGain();
                
                oscillator.connect(gainNode);
                gainNode.connect(audioCtx.destination);
                
                // Set volume to 0
                gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
                
                oscillator.start(audioCtx.currentTime);
                oscillator.stop(audioCtx.currentTime + 0.1);
                
                this.audioInitialized = true;
                
                // Wait a short time to ensure the audio system is ready
                setTimeout(() => {
                    resolve();
                }, 100);
            } catch (e) {
                console.error('Audio unlock failed:', e);
                this.audioInitialized = false;
                resolve(); // Resolve anyway to allow game to start
            }
        });
    }
    
    initSounds() {
        // Lazy audio context creation to avoid browser autoplay restrictions.
        let audioCtx = null;
        let unlocked = false; // track whether we've played the unlock buffer
        const ensureAudioCtx = async () => {
            if (!audioCtx) {
                const AudioContext = window.AudioContext || window.webkitAudioContext;
                audioCtx = new AudioContext();
            }
            if (audioCtx.state === 'suspended') {
                try {
                    await audioCtx.resume();
                } catch (e) {
                    console.warn('Audio context resume failed:', e);
                    // ignore; will try again on next user gesture or sound call
                }
            }
            // Play a very short silent buffer once to fully unlock audio on some browsers
            if (!unlocked) {
                try {
                    const buffer = audioCtx.createBuffer(1, 1, audioCtx.sampleRate);
                    const src = audioCtx.createBufferSource();
                    src.buffer = buffer;
                    src.connect(audioCtx.destination);
                    src.start(0);
                    // small timeout to allow the node to run
                    setTimeout(() => {
                        try { src.disconnect(); } catch (e) {}
                    }, 50);
                    unlocked = true;
                } catch (e) {
                    console.warn('Audio unlock failed:', e);
                    // If this fails, don't block — subsequent user gestures may still unlock
                }
            }
            return audioCtx;
        };
        
        return {
            ensureAudioCtx,
            
            // Play a simple tone
            playTone: async (frequency, duration, volume = 0.1) => {
                if (!this.audioInitialized) return;
                try {
                    const audioCtx = await ensureAudioCtx();
                    
                    const oscillator = audioCtx.createOscillator();
                    const gainNode = audioCtx.createGain();
                    
                    oscillator.connect(gainNode);
                    gainNode.connect(audioCtx.destination);
                    
                    oscillator.frequency.value = frequency;
                    oscillator.type = 'sine';
                    
                    gainNode.gain.setValueAtTime(volume, audioCtx.currentTime);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
                    
                    oscillator.start(audioCtx.currentTime);
                    oscillator.stop(audioCtx.currentTime + duration);
                } catch (e) {
                    console.warn('Error playing tone:', e);
                }
            },
            
            // Plankton collection sound
            collectPlankton: async () => {
                if (!this.audioInitialized) return;
                try {
                    const audioCtx = await ensureAudioCtx();
                    
                    const oscillator = audioCtx.createOscillator();
                    const gainNode = audioCtx.createGain();
                    
                    oscillator.connect(gainNode);
                    gainNode.connect(audioCtx.destination);
                    
                    oscillator.frequency.setValueAtTime(600, audioCtx.currentTime);
                    oscillator.frequency.exponentialRampToValueAtTime(1200, audioCtx.currentTime + 0.1);
                    oscillator.type = 'sine';
                    
                    gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);
                    
                    oscillator.start(audioCtx.currentTime);
                    oscillator.stop(audioCtx.currentTime + 0.1);
                } catch (e) {
                    console.warn('Error playing collectPlankton sound:', e);
                }
            },
            
            // Collision/damage sound
            collision: async () => {
                if (!this.audioInitialized) return;
                try {
                    const audioCtx = await ensureAudioCtx();
                    
                    const oscillator = audioCtx.createOscillator();
                    const gainNode = audioCtx.createGain();
                    
                    oscillator.connect(gainNode);
                    gainNode.connect(audioCtx.destination);
                    
                    oscillator.frequency.setValueAtTime(200, audioCtx.currentTime);
                    oscillator.frequency.exponentialRampToValueAtTime(50, audioCtx.currentTime + 0.2);
                    oscillator.type = 'sawtooth';
                    
                    gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.2);
                    
                    oscillator.start(audioCtx.currentTime);
                    oscillator.stop(audioCtx.currentTime + 0.2);
                } catch (e) {
                    console.warn('Error playing collision sound:', e);
                }
            },
            
            // Victory sound
            victory: async () => {
                if (!this.audioInitialized) return;
                try {
                    const audioCtx = await ensureAudioCtx();
                    
                    // Play a series of ascending notes
                    const notes = [523, 659, 784, 1047]; // C, E, G, C
                    notes.forEach((freq, i) => {
                        setTimeout(async () => {
                            try {
                                // use the same resumed context
                                const oscillator = audioCtx.createOscillator();
                                const gainNode = audioCtx.createGain();
                                
                                oscillator.connect(gainNode);
                                gainNode.connect(audioCtx.destination);
                                
                                oscillator.frequency.value = freq;
                                oscillator.type = 'sine';
                                
                                gainNode.gain.setValueAtTime(0.15, audioCtx.currentTime);
                                gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.3);
                                
                                oscillator.start(audioCtx.currentTime);
                                oscillator.stop(audioCtx.currentTime + 0.3);
                            } catch (e) {
                                console.warn('Error playing victory note:', e);
                            }
                        }, i * 150);
                    });
                } catch (e) {
                    console.warn('Error preparing victory sound:', e);
                }
            },
            
            // Game over sound
            gameOver: async () => {
                if (!this.audioInitialized) return;
                try {
                    const audioCtx = await ensureAudioCtx();
                    
                    const oscillator = audioCtx.createOscillator();
                    const gainNode = audioCtx.createGain();
                    
                    oscillator.connect(gainNode);
                    gainNode.connect(audioCtx.destination);
                    
                    oscillator.frequency.setValueAtTime(400, audioCtx.currentTime);
                    oscillator.frequency.exponentialRampToValueAtTime(100, audioCtx.currentTime + 0.5);
                    oscillator.type = 'triangle';
                    
                    gainNode.gain.setValueAtTime(0.2, audioCtx.currentTime);
                    gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);
                    
                    oscillator.start(audioCtx.currentTime);
                    oscillator.stop(audioCtx.currentTime + 0.5);
                } catch (e) {
                    console.warn('Error playing gameOver sound:', e);
                }
            }
        };
    }
    
    init() {
        // Initialize fish school positions
        this.initializeFishSchool();
        
        // Spawn entities
        this.spawnJellyfish();
        this.spawnPredators();
        this.spawnPlankton();
        
        // Event listeners
        window.addEventListener('resize', () => this.resizeCanvas());
        document.addEventListener('keydown', (e) => {
            this.keys[e.key.toLowerCase()] = true;
            if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', ' '].includes(e.key)) {
                e.preventDefault();
            }
            
            // Try to unlock audio on any keypress
            if (!this.audioInitialized) {
                this.unlockAudio();
            }
        });
        document.addEventListener('keyup', (e) => {
            this.keys[e.key.toLowerCase()] = false;
        });
        
        document.getElementById('restart-button').addEventListener('click', () => {
            // Ensure audio is initialized when restarting
            if (!this.audioInitialized) {
                this.unlockAudio().then(() => this.restart());
            } else {
                this.restart();
            }
        });
        
        // Unlock audio on first user gesture (helps browsers allow audio immediately)
        const resumeAudio = () => {
            if (this.sounds && this.sounds.ensureAudioCtx) {
                this.sounds.ensureAudioCtx();
            }
        };
        document.addEventListener('pointerdown', resumeAudio, { once: true });
        document.addEventListener('keydown', resumeAudio, { once: true });
        
        // Start game
        this.start();
    }
    
    initializeFishSchool() {
        this.player.fishPositions = [];
        for (let i = 0; i < this.fishCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * CONFIG.SCHOOL_SPREAD;
            this.player.fishPositions.push({
                x: this.player.x + Math.cos(angle) * distance,
                y: this.player.y + Math.sin(angle) * distance,
                vx: 0,
                vy: 0
            });
        }
    }
    
    spawnJellyfish() {
        this.jellyfish = [];
        // Start with initial jellyfish count
        const count = this.getCurrentJellyfishCount();
        for (let i = 0; i < count; i++) {
            this.addJellyfish();
        }
    }
    
    addJellyfish() {
        this.jellyfish.push({
            x: Math.random() * this.canvas.width,
            y: Math.random() * this.canvas.height,
            vx: (Math.random() - 0.5) * CONFIG.JELLYFISH_SPEED,
            vy: (Math.random() - 0.5) * CONFIG.JELLYFISH_SPEED,
            size: 20 + Math.random() * 15,
            pulsePhase: Math.random() * Math.PI * 2,
            // per-jelly control for tentacle waving
            tentacleWavePhase: Math.random() * Math.PI * 2,
            tentacleOffsets: Array.from({length: 6}, () => Math.random() * Math.PI * 2),
            damageCooldown: 0 // Cooldown timer to prevent multiple rapid hits
        });
    }
    
    spawnPredators() {
        this.predators = [];
        // Start with 0 predators - they will spawn progressively
    }
    
    addPredator() {
        // Spawn predators at edges
        const edge = Math.floor(Math.random() * 4);
        let x, y;
        switch(edge) {
            case 0: x = Math.random() * this.canvas.width; y = -30; break;
            case 1: x = this.canvas.width + 30; y = Math.random() * this.canvas.height; break;
            case 2: x = Math.random() * this.canvas.width; y = this.canvas.height + 30; break;
            case 3: x = -30; y = Math.random() * this.canvas.height; break;
        }
        this.predators.push({
            x: x,
            y: y,
            vx: (Math.random() - 0.5) * 0.5,
            vy: (Math.random() - 0.5) * 0.5,
            size: 30 + Math.random() * 20,
            huntCooldown: 0,
            patrolAngle: Math.random() * Math.PI * 2 // Random patrol direction
        });
    }
    
    getCurrentPredatorCount() {
        // Gradually increase from 0 to MAX_PREDATOR_COUNT over the game duration
        const progress = this.elapsedTime / CONFIG.GAME_DURATION;
        return Math.floor(progress * CONFIG.MAX_PREDATOR_COUNT);
    }
    
    getCurrentJellyfishCount() {
        // Gradually increase from INITIAL to MAX over the game duration
        const progress = this.elapsedTime / CONFIG.GAME_DURATION;
        return Math.floor(CONFIG.INITIAL_JELLYFISH_COUNT + 
            progress * (CONFIG.MAX_JELLYFISH_COUNT - CONFIG.INITIAL_JELLYFISH_COUNT));
    }
    
    spawnPlankton() {
        this.plankton = [];
        for (let i = 0; i < CONFIG.PLANKTON_COUNT; i++) {
            this.spawnSinglePlankton();
        }
    }
    
    spawnSinglePlankton() {
        this.plankton.push({
            x: Math.random() * this.canvas.width,
            y: Math.random() * this.canvas.height,
            size: 4 + Math.random() * 3,
            floatPhase: Math.random() * Math.PI * 2
        });
    }
    
    start() {
        this.running = true;
        this.lastTime = performance.now();
        this.gameLoop();
    }
    
    gameLoop(currentTime = 0) {
        if (!this.running) return;
        
        const deltaTime = (currentTime - this.lastTime) / 1000;
        this.lastTime = currentTime;
        
        this.update(deltaTime);
        this.render();
        
        this.animationId = requestAnimationFrame((time) => this.gameLoop(time));
    }
    
    update(dt) {
        // Cap delta time to prevent huge jumps
        dt = Math.min(dt, 0.1);
        
        // Update timer and elapsed time
        this.timeRemaining -= dt;
        this.elapsedTime += dt;
        
        if (this.timeRemaining <= 0) {
            this.win();
            return;
        }
        
        // Progressive difficulty: add predators and jellyfish over time
        this.updateDifficulty();
        
        // Update hunger
        this.hunger += CONFIG.HUNGER_RATE * dt;
        if (this.hunger > CONFIG.HUNGER_MAX) {
            this.hunger = CONFIG.HUNGER_MAX;
            // Starvation damage
            this.fishCount -= CONFIG.STARVATION_DAMAGE * dt;
            if (this.fishCount <= 0) {
                this.gameOver('Your school starved to death!');
                return;
            }
        }
        
        // Update player
        this.updatePlayer(dt);
        
        // Update jellyfish
        this.updateJellyfish(dt);
        
        // Update predators
        this.updatePredators(dt);
        
        // Update plankton
        this.updatePlankton(dt);
        
        // Check collisions
        this.checkCollisions();
        
        // Update UI
        this.updateUI();
        
        // Remove excess fish positions if count decreased
        while (this.player.fishPositions.length > Math.ceil(this.fishCount)) {
            this.player.fishPositions.pop();
        }
    }
    
    updateDifficulty() {
        // Add predators progressively
        const targetPredators = this.getCurrentPredatorCount();
        while (this.predators.length < targetPredators) {
            this.addPredator();
        }
        
        // Add jellyfish progressively
        const targetJellyfish = this.getCurrentJellyfishCount();
        while (this.jellyfish.length < targetJellyfish) {
            this.addJellyfish();
        }
    }
    
    updatePlayer(dt) {
        // Handle input
        let inputX = 0;
        let inputY = 0;
        
        if (this.keys['arrowup'] || this.keys['w']) inputY -= 1;
        if (this.keys['arrowdown'] || this.keys['s']) inputY += 1;
        if (this.keys['arrowleft'] || this.keys['a']) inputX -= 1;
        if (this.keys['arrowright'] || this.keys['d']) inputX += 1;
        
        // Normalize diagonal movement
        if (inputX !== 0 && inputY !== 0) {
            inputX *= 0.707;
            inputY *= 0.707;
        }
        
        // Update player velocity
        this.player.vx = inputX * CONFIG.PLAYER_SPEED;
        this.player.vy = inputY * CONFIG.PLAYER_SPEED;
        
        // Update player position
        this.player.x += this.player.vx;
        this.player.y += this.player.vy;
        
        // Keep player in bounds
        this.player.x = Math.max(50, Math.min(this.canvas.width - 50, this.player.x));
        this.player.y = Math.max(50, Math.min(this.canvas.height - 50, this.player.y));
        
        // Update fish school positions with flocking behavior
        this.player.fishPositions.forEach(fish => {
            // Move towards player (center of school)
            const dx = this.player.x - fish.x;
            const dy = this.player.y - fish.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist > 0) {
                const force = Math.min(dist / CONFIG.SCHOOL_SPREAD, 1);
                // Reduce clustering force with SCHOOL_CLUSTER_SPREAD parameter
                fish.vx += (dx / dist) * force * 0.5 * CONFIG.SCHOOL_CLUSTER_SPREAD;
                fish.vy += (dy / dist) * force * 0.5 * CONFIG.SCHOOL_CLUSTER_SPREAD;
            }
            
            // Add some randomness for more natural spread
            fish.vx += (Math.random() - 0.5) * 0.5;
            fish.vy += (Math.random() - 0.5) * 0.5;
            
            // Apply velocity damping
            fish.vx *= 0.9;
            fish.vy *= 0.9;
            
            // Update position
            fish.x += fish.vx;
            fish.y += fish.vy;
        });
    }
    
    updateJellyfish(dt) {
        this.jellyfish.forEach(jelly => {
            // Drift slowly
            jelly.x += jelly.vx;
            jelly.y += jelly.vy;
            
            // Bounce off walls
            if (jelly.x < 0 || jelly.x > this.canvas.width) {
                jelly.vx *= -1;
                jelly.x = Math.max(0, Math.min(this.canvas.width, jelly.x));
            }
            if (jelly.y < 0 || jelly.y > this.canvas.height) {
                jelly.vy *= -1;
                jelly.y = Math.max(0, Math.min(this.canvas.height, jelly.y));
            }
            
            // Update pulse phase
            jelly.pulsePhase += dt * 2;
            // Update tentacle wave phase (faster than bell pulse for visible motion)
            jelly.tentacleWavePhase += dt * 3;
            
            // Update damage cooldown
            if (jelly.damageCooldown > 0) {
                jelly.damageCooldown -= dt;
            }
        });
    }
    
    updatePredators(dt) {
        this.predators.forEach(predator => {
            // Update hunt cooldown
            if (predator.huntCooldown > 0) {
                predator.huntCooldown -= dt;
            }
            
            // Calculate distance to player
            const dx = this.player.x - predator.x;
            const dy = this.player.y - predator.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            // Only hunt if player is within detection range
            if (dist < CONFIG.PREDATOR_DETECTION_RANGE && dist > 0) {
                // Hunt mode: move toward player
                const targetVx = (dx / dist) * CONFIG.PREDATOR_SPEED;
                const targetVy = (dy / dist) * CONFIG.PREDATOR_SPEED;
                
                // Smooth transition to hunting velocity
                predator.vx += (targetVx - predator.vx) * 0.1;
                predator.vy += (targetVy - predator.vy) * 0.1;
            } else {
                // Patrol mode: swim in random direction
                predator.patrolAngle += (Math.random() - 0.5) * 0.1;
                const patrolSpeed = CONFIG.PREDATOR_SPEED * 0.3;
                const targetVx = Math.cos(predator.patrolAngle) * patrolSpeed;
                const targetVy = Math.sin(predator.patrolAngle) * patrolSpeed;
                
                // Smooth transition to patrol velocity
                predator.vx += (targetVx - predator.vx) * 0.05;
                predator.vy += (targetVy - predator.vy) * 0.05;
            }
            
            predator.x += predator.vx;
            predator.y += predator.vy;
            
            // Wrap around screen edges
            if (predator.x < -50) predator.x = this.canvas.width + 50;
            if (predator.x > this.canvas.width + 50) predator.x = -50;
            if (predator.y < -50) predator.y = this.canvas.height + 50;
            if (predator.y > this.canvas.height + 50) predator.y = -50;
        });
    }
    
    updatePlankton(dt) {
        this.plankton.forEach(p => {
            p.floatPhase += dt;
            // Slight floating movement
            p.y += Math.sin(p.floatPhase) * 0.3;
        });
    }
    
    checkCollisions() {
        // Check jellyfish collisions
        this.jellyfish.forEach(jelly => {
            // Only apply damage if cooldown has expired
            if (jelly.damageCooldown <= 0) {
                let collisionDetected = false;
                
                this.player.fishPositions.forEach(fish => {
                    const dx = fish.x - jelly.x;
                    const dy = fish.y - jelly.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    
                    if (dist < jelly.size) {
                        if (!collisionDetected) {
                            // Apply damage only once per jellyfish per cooldown period
                            this.fishCount = Math.max(0, this.fishCount - CONFIG.COLLISION_DAMAGE);
                            jelly.damageCooldown = 1.0; // 1 second cooldown
                            collisionDetected = true;
                            
                            // Play collision sound
                            this.sounds.collision();
                            
                            if (this.fishCount <= 0) {
                                this.gameOver('All your fish were stung by jellyfish!');
                            }
                        }
                        // Push fish away regardless
                        fish.vx += (dx / dist) * 5;
                        fish.vy += (dy / dist) * 5;
                    }
                });
            }
        });
        
        // Check predator collisions
        this.predators.forEach(predator => {
            // Only apply damage if cooldown has expired
            if (predator.huntCooldown <= 0) {
                let collisionDetected = false;
                
                this.player.fishPositions.forEach(fish => {
                    const dx = fish.x - predator.x;
                    const dy = fish.y - predator.y;
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    
                    if (dist < predator.size) {
                        if (!collisionDetected) {
                            // Apply damage only once per predator per cooldown period
                            this.fishCount = Math.max(0, this.fishCount - CONFIG.COLLISION_DAMAGE);
                            predator.huntCooldown = 1.0; // 1 second cooldown
                            collisionDetected = true;
                            
                            // Play collision sound
                            this.sounds.collision();
                            
                            if (this.fishCount <= 0) {
                                this.gameOver('Your school was eaten by predators!');
                            }
                        }
                        // Push fish away regardless
                        fish.vx += (dx / dist) * 8;
                        fish.vy += (dy / dist) * 8;
                    }
                });
            }
        });
        
        // Check plankton collection
        for (let i = this.plankton.length - 1; i >= 0; i--) {
            const p = this.plankton[i];
            
            // Check collision with any fish in school
            for (let fish of this.player.fishPositions) {
                const dx = fish.x - p.x;
                const dy = fish.y - p.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                if (dist < 15) {
                    this.hunger = Math.max(0, this.hunger - CONFIG.PLANKTON_NUTRITION);
                    this.plankton.splice(i, 1);
                    // Spawn new plankton
                    this.spawnSinglePlankton();
                    
                    // Play collection sound
                    this.sounds.collectPlankton();
                    break;
                }
            }
        }
    }
    
    render() {
        // Clear canvas
        this.ctx.fillStyle = '#002040';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw ocean pattern
        this.drawOceanBackground();
        
        // Draw plankton
        this.plankton.forEach(p => this.drawPlankton(p));
        
        // Draw jellyfish
        this.jellyfish.forEach(jelly => this.drawJellyfish(jelly));
        
        // Draw predators
        this.predators.forEach(predator => this.drawPredator(predator));
        
        // Draw fish school
        this.drawFishSchool();
    }
    
    drawOceanBackground() {
        // Draw subtle water effect
        this.ctx.globalAlpha = 0.05;
        for (let i = 0; i < 20; i++) {
            const y = (i * this.canvas.height / 20 + performance.now() / 100) % this.canvas.height;
            this.ctx.strokeStyle = '#4080a0';
            this.ctx.lineWidth = 1;
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.canvas.width, y);
            this.ctx.stroke();
        }
        this.ctx.globalAlpha = 1;
    }
    
    drawPlankton(p) {
        this.ctx.fillStyle = '#88ff44';
        this.ctx.globalAlpha = 0.7;
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Glow effect
        const gradient = this.ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * 2);
        gradient.addColorStop(0, 'rgba(136, 255, 68, 0.3)');
        gradient.addColorStop(1, 'rgba(136, 255, 68, 0)');
        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, p.size * 2, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.globalAlpha = 1;
    }
    
    drawJellyfish(jelly) {
        const pulse = Math.sin(jelly.pulsePhase) * 0.2 + 1;
        const size = jelly.size * pulse;
        
        // Body (bell)
        this.ctx.fillStyle = 'rgba(255, 100, 200, 0.6)';
        this.ctx.beginPath();
        this.ctx.arc(jelly.x, jelly.y, size, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Tentacles: draw as waving quadratic curves
        this.ctx.strokeStyle = 'rgba(255, 100, 200, 0.45)';
        for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2;
            const tentacleLength = size * 1.5;
            
            // start a bit out from the bell edge for a nicer join
            const startX = jelly.x + Math.cos(angle) * size * 0.6;
            const startY = jelly.y + Math.sin(angle) * size * 0.6;
            
            // end point of the tentacle
            const endX = jelly.x + Math.cos(angle) * tentacleLength;
            const endY = jelly.y + Math.sin(angle) * tentacleLength;
            
            // waving control point: perpendicular wobble using per-tentacle offset + global phase
            const wobble = Math.sin(jelly.tentacleWavePhase + (jelly.tentacleOffsets ? jelly.tentacleOffsets[i] : i));
            const perpAngle = angle + Math.PI / 2;
            const controlDist = tentacleLength * 0.4;
            const controlX = jelly.x + Math.cos(angle) * (tentacleLength * 0.5) + Math.cos(perpAngle) * controlDist * wobble;
            const controlY = jelly.y + Math.sin(angle) * (tentacleLength * 0.5) + Math.sin(perpAngle) * controlDist * wobble;
            
            this.ctx.lineWidth = 2 * (0.8 + 0.4 * (1 - Math.abs(wobble))); // subtle thickness variation
            this.ctx.beginPath();
            this.ctx.moveTo(startX, startY);
            this.ctx.quadraticCurveTo(controlX, controlY, endX, endY);
            this.ctx.stroke();
        }
        
        // Glow
        const gradient = this.ctx.createRadialGradient(jelly.x, jelly.y, 0, jelly.x, jelly.y, size * 1.5);
        gradient.addColorStop(0, 'rgba(255, 100, 200, 0.3)');
        gradient.addColorStop(1, 'rgba(255, 100, 200, 0)');
        this.ctx.fillStyle = gradient;
        this.ctx.beginPath();
        this.ctx.arc(jelly.x, jelly.y, size * 1.5, 0, Math.PI * 2);
        this.ctx.fill();
        
        // restore lineWidth to default (in case other draws rely on it)
        this.ctx.lineWidth = 1;
    }
    
    drawPredator(predator) {
        // Body
        this.ctx.fillStyle = '#ff4400';
        this.ctx.beginPath();
        
        // Calculate direction
        const angle = Math.atan2(predator.vy, predator.vx);
        
        // Draw fish shape
        this.ctx.save();
        this.ctx.translate(predator.x, predator.y);
        this.ctx.rotate(angle);
        
        // Body
        this.ctx.fillStyle = '#cc3300';
        this.ctx.beginPath();
        this.ctx.ellipse(0, 0, predator.size, predator.size * 0.6, 0, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Tail
        this.ctx.beginPath();
        this.ctx.moveTo(-predator.size, 0);
        this.ctx.lineTo(-predator.size * 1.4, -predator.size * 0.4);
        this.ctx.lineTo(-predator.size * 1.4, predator.size * 0.4);
        this.ctx.closePath();
        this.ctx.fill();
        
        // Eye
        this.ctx.fillStyle = '#ffffff';
        this.ctx.beginPath();
        this.ctx.arc(predator.size * 0.4, -predator.size * 0.2, predator.size * 0.15, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.fillStyle = '#000000';
        this.ctx.beginPath();
        this.ctx.arc(predator.size * 0.45, -predator.size * 0.2, predator.size * 0.08, 0, Math.PI * 2);
        this.ctx.fill();
        
        this.ctx.restore();
    }
    
    drawFishSchool() {
        // Draw each fish in the school
        this.player.fishPositions.forEach(fish => {
            // Calculate direction
            const angle = Math.atan2(fish.vy, fish.vx);
            
            this.ctx.save();
            this.ctx.translate(fish.x, fish.y);
            this.ctx.rotate(angle);
            
            // Body
            this.ctx.fillStyle = '#00aaff';
            this.ctx.beginPath();
            this.ctx.ellipse(0, 0, CONFIG.FISH_SIZE * 1.5, CONFIG.FISH_SIZE, 0, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Tail
            this.ctx.beginPath();
            this.ctx.moveTo(-CONFIG.FISH_SIZE * 1.5, 0);
            this.ctx.lineTo(-CONFIG.FISH_SIZE * 2, -CONFIG.FISH_SIZE * 0.8);
            this.ctx.lineTo(-CONFIG.FISH_SIZE * 2, CONFIG.FISH_SIZE * 0.8);
            this.ctx.closePath();
            this.ctx.fill();
            
            this.ctx.restore();
        });
        
        // Draw a subtle circle showing school center
        this.ctx.strokeStyle = 'rgba(0, 170, 255, 0.3)';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.arc(this.player.x, this.player.y, CONFIG.SCHOOL_SPREAD, 0, Math.PI * 2);
        this.ctx.stroke();
    }
    
    updateUI() {
        document.getElementById('fish-count').textContent = Math.ceil(this.fishCount);
        
        const minutes = Math.floor(this.timeRemaining / 60);
        const seconds = Math.floor(this.timeRemaining % 60);
        document.getElementById('timer').textContent = 
            `${minutes}:${seconds.toString().padStart(2, '0')}`;
        
        const hungerPercent = (this.hunger / CONFIG.HUNGER_MAX) * 100;
        const hungerFill = document.getElementById('hunger-fill');
        hungerFill.style.width = `${Math.max(0, 100 - hungerPercent)}%`;
        
        hungerFill.classList.remove('low', 'critical');
        if (hungerPercent > 70) {
            hungerFill.classList.add('critical');
        } else if (hungerPercent > 40) {
            hungerFill.classList.add('low');
        }
    }
    
    gameOver(message) {
        this.running = false;
        cancelAnimationFrame(this.animationId);
        
        // Play game over sound
        this.sounds.gameOver();
        
        this.showOverlay('Game Over', message);
    }
    
    win() {
        this.running = false;
        cancelAnimationFrame(this.animationId);
        const fishLeft = Math.ceil(this.fishCount);
        
        // Play victory sound
        this.sounds.victory();
        
        // Start a short celebration animation of a happy fish swimming away
        this.startVictoryAnimation();
        
        this.showOverlay(
            'Victory!', 
            `You survived 5 minutes with ${fishLeft} fish remaining!`
        );
    }
    
    // Start the victory animation: spawns a happy fish at the school's center and begins its RAF loop
    startVictoryAnimation() {
        if (this.victoryAnimation.active) return;
        this.victoryAnimation.active = true;
        this.victoryAnimation.lastTime = performance.now();
        
        // Initialize a happy fish starting at the school center
        this.victoryAnimation.fish = {
            x: this.player.x,
            y: this.player.y,
            vx: 60 + Math.random() * 40, // px/sec to the right
            vy: -10 + Math.random() * -20, // slight upward drift
            size: CONFIG.FISH_SIZE * 10,
            tailPhase: Math.random() * Math.PI * 2,
            bobPhase: Math.random() * Math.PI * 2,
            rotation: 0
        };

        // Initialize victory message
        this.victoryAnimation.message = {
            text: 'You survived! Great job!',
            age: 0,
            duration: 2.0, // seconds before starting to fade
            fadeDuration: 1.5,
            opacity: 1
        };
        
        const loop = (t) => this.victoryLoop(t);
        this.victoryAnimation.rafId = requestAnimationFrame(loop);
    }
    
    victoryLoop(currentTime = 0) {
        if (!this.victoryAnimation.active) return;
        const va = this.victoryAnimation;
        const dt = Math.min((currentTime - va.lastTime) / 1000, 0.05);
        va.lastTime = currentTime;
        
        // Update fish motion
        this.updateVictoryAnimation(dt);
        
        // Update message timing/opacities
        if (va.message) {
            va.message.age += dt;
            if (va.message.age >= va.message.duration) {
                const t = (va.message.age - va.message.duration) / Math.max(0.0001, va.message.fadeDuration);
                va.message.opacity = Math.max(0, 1 - t);
            }
        }
        
        // Render base scene then draw victory fish and message on top
        this.render();
        this.drawVictoryAnimation();
        
        // Continue until fish is off screen and message fully faded (then stop)
        const fish = va.fish;
        const messageGone = !va.message || va.message.opacity <= 0;
        if (fish && (fish.x < this.canvas.width + fish.size && fish.y > -100) || !messageGone) {
            va.rafId = requestAnimationFrame((t) => this.victoryLoop(t));
        } else {
            this.stopVictoryAnimation();
        }
    }
    
    updateVictoryAnimation(dt) {
        const fish = this.victoryAnimation.fish;
        if (!fish) return;
        
        // Gentle acceleration to the right and upward easing
        fish.x += fish.vx * dt;
        fish.y += fish.vy * dt;
        
        // Slow downward gravity effect reduction so it keeps drifting slightly upward initially
        fish.vy += 8 * dt * 0.1;
        
        // Tail and bob phases for visual motion
        fish.tailPhase += dt * 12;
        fish.bobPhase += dt * 2;
        
        // gentle rotation based on velocity direction
        fish.rotation = Math.atan2(fish.vy, fish.vx) * 0.6;
    }
    
    drawVictoryAnimation() {
        const fish = this.victoryAnimation.fish;
        if (!fish && !this.victoryAnimation.message) return;
        const ctx = this.ctx;
        
        // Draw message behind/above fish (if present)
        const msg = this.victoryAnimation.message;
        if (msg && msg.opacity > 0) {
            ctx.save();
            const opacity = Math.max(0, Math.min(1, msg.opacity));
            ctx.globalAlpha = opacity;
            ctx.fillStyle = '#ffffff';
            ctx.shadowColor = 'rgba(0,0,0,0.6)';
            ctx.shadowBlur = 12;
            ctx.font = `bold 36px sans-serif`;
            
            // Position message near top-center (slightly below overlay to remain visible)
            const text = msg.text;
            const x = this.canvas.width / 2;
            const y = Math.max(60, this.canvas.height * 0.18);
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(text, x, y);
            ctx.restore();
        }
        
        if (!fish) return;
        
        ctx.save();
        ctx.translate(fish.x, fish.y + Math.sin(fish.bobPhase) * 6);
        ctx.rotate(fish.rotation);
        
        // Body
        ctx.fillStyle = '#66ccff';
        ctx.beginPath();
        ctx.ellipse(0, 0, fish.size, fish.size * 0.7, 0, 0, Math.PI * 2);
        ctx.fill();
        
        // Tail wagging (two triangles) using tailPhase sine
        const wag = Math.sin(fish.tailPhase) * (fish.size * 0.25);
        ctx.fillStyle = '#4fb0e6';
        ctx.beginPath();
        ctx.moveTo(-fish.size, 0);
        ctx.lineTo(-fish.size - fish.size * 0.6, -fish.size * 0.4 + wag);
        ctx.lineTo(-fish.size - fish.size * 0.6, fish.size * 0.4 + wag);
        ctx.closePath();
        ctx.fill();
        
        // Eye (happy)
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(fish.size * 0.35, -fish.size * 0.18, fish.size * 0.12, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#000000';
        ctx.beginPath();
        ctx.arc(fish.size * 0.38, -fish.size * 0.18, fish.size * 0.05, 0, Math.PI * 2);
        ctx.fill();
        
        // Smile
        ctx.strokeStyle = '#000000';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(fish.size * 0.25, fish.size * 0.05, fish.size * 0.18, 0.2 * Math.PI, 0.8 * Math.PI);
        ctx.stroke();
        
        // small bubble trail
        for (let i = 0; i < 3; i++) {
            const bx = -i * 12 - (performance.now() / 40 % 12);
            const by = -Math.abs(Math.sin((performance.now() / 300) + i)) * 8 - 8 - i * 6;
            ctx.globalAlpha = 0.6 - i * 0.18;
            ctx.fillStyle = 'rgba(200,230,255,0.9)';
            ctx.beginPath();
            ctx.arc(bx, by, Math.max(1.5, 4 - i), 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
        
        ctx.restore();
    }
    
    stopVictoryAnimation() {
        const va = this.victoryAnimation;
        if (!va.active) return;
        va.active = false;
        if (va.rafId) {
            cancelAnimationFrame(va.rafId);
            va.rafId = null;
        }
        va.fish = null;
        va.message = null;
    }
    
    restart() {
        document.getElementById('game-overlay').style.display = 'none';
        
        // Stop any active victory animation
        this.stopVictoryAnimation();
        
        // Reset game state
        this.fishCount = CONFIG.INITIAL_FISH_COUNT;
        this.timeRemaining = CONFIG.GAME_DURATION;
        this.hunger = 0;
        this.elapsedTime = 0;
        
        // Reset player
        this.player.x = this.canvas.width / 2;
        this.player.y = this.canvas.height / 2;
        this.player.vx = 0;
        this.player.vy = 0;
        
        // Respawn entities
        this.initializeFishSchool();
        this.spawnJellyfish();
        this.spawnPredators();
        this.spawnPlankton();
        
        // Restart game
        this.start();
    }
}

// Initialize game when page loads
window.addEventListener('DOMContentLoaded', () => {
    const game = new Game();
    // Don't auto-start; wait for audio prompt interaction
});
