// Game configuration
const CONFIG = {
    INITIAL_FISH_COUNT: 100,
    GAME_DURATION: 300, // 5 minutes in seconds
    PLAYER_SPEED: 3,
    JELLYFISH_SPEED: 1.5,
    PREDATOR_SPEED: 2.5,
    JELLYFISH_COUNT: 8,
    PREDATOR_COUNT: 5,
    PLANKTON_COUNT: 15,
    FISH_SIZE: 3,
    SCHOOL_SPREAD: 60,
    HUNGER_RATE: 0.05, // Hunger increases per second
    HUNGER_MAX: 100,
    PLANKTON_NUTRITION: 30,
    COLLISION_DAMAGE: 5, // Fish lost per collision
    STARVATION_DAMAGE: 0.2, // Fish lost per second when starving
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
        
        this.init();
    }
    
    resizeCanvas() {
        const rect = this.canvas.getBoundingClientRect();
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
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
        });
        document.addEventListener('keyup', (e) => {
            this.keys[e.key.toLowerCase()] = false;
        });
        
        document.getElementById('restart-button').addEventListener('click', () => {
            this.restart();
        });
        
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
        for (let i = 0; i < CONFIG.JELLYFISH_COUNT; i++) {
            this.jellyfish.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                vx: (Math.random() - 0.5) * CONFIG.JELLYFISH_SPEED,
                vy: (Math.random() - 0.5) * CONFIG.JELLYFISH_SPEED,
                size: 20 + Math.random() * 15,
                pulsePhase: Math.random() * Math.PI * 2
            });
        }
    }
    
    spawnPredators() {
        this.predators = [];
        for (let i = 0; i < CONFIG.PREDATOR_COUNT; i++) {
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
                vx: 0,
                vy: 0,
                size: 30 + Math.random() * 20,
                huntCooldown: 0
            });
        }
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
        
        // Update timer
        this.timeRemaining -= dt;
        if (this.timeRemaining <= 0) {
            this.win();
            return;
        }
        
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
                fish.vx += (dx / dist) * force * 0.5;
                fish.vy += (dy / dist) * force * 0.5;
            }
            
            // Add some randomness
            fish.vx += (Math.random() - 0.5) * 0.3;
            fish.vy += (Math.random() - 0.5) * 0.3;
            
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
        });
    }
    
    updatePredators(dt) {
        this.predators.forEach(predator => {
            // Hunt player
            const dx = this.player.x - predator.x;
            const dy = this.player.y - predator.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist > 0) {
                predator.vx = (dx / dist) * CONFIG.PREDATOR_SPEED;
                predator.vy = (dy / dist) * CONFIG.PREDATOR_SPEED;
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
            this.player.fishPositions.forEach(fish => {
                const dx = fish.x - jelly.x;
                const dy = fish.y - jelly.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                if (dist < jelly.size) {
                    this.fishCount = Math.max(0, this.fishCount - CONFIG.COLLISION_DAMAGE);
                    // Push fish away
                    fish.vx += (dx / dist) * 5;
                    fish.vy += (dy / dist) * 5;
                    
                    if (this.fishCount <= 0) {
                        this.gameOver('All your fish were stung by jellyfish!');
                    }
                }
            });
        });
        
        // Check predator collisions
        this.predators.forEach(predator => {
            this.player.fishPositions.forEach(fish => {
                const dx = fish.x - predator.x;
                const dy = fish.y - predator.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                
                if (dist < predator.size) {
                    this.fishCount = Math.max(0, this.fishCount - CONFIG.COLLISION_DAMAGE);
                    // Push fish away
                    fish.vx += (dx / dist) * 8;
                    fish.vy += (dy / dist) * 8;
                    
                    if (this.fishCount <= 0) {
                        this.gameOver('Your school was eaten by predators!');
                    }
                }
            });
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
        
        // Body
        this.ctx.fillStyle = 'rgba(255, 100, 200, 0.6)';
        this.ctx.beginPath();
        this.ctx.arc(jelly.x, jelly.y, size, 0, Math.PI * 2);
        this.ctx.fill();
        
        // Tentacles
        this.ctx.strokeStyle = 'rgba(255, 100, 200, 0.4)';
        this.ctx.lineWidth = 2;
        for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2;
            this.ctx.beginPath();
            this.ctx.moveTo(jelly.x, jelly.y);
            const tentacleLength = size * 1.5;
            this.ctx.lineTo(
                jelly.x + Math.cos(angle) * tentacleLength,
                jelly.y + Math.sin(angle) * tentacleLength
            );
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
        this.showOverlay('Game Over', message);
    }
    
    win() {
        this.running = false;
        cancelAnimationFrame(this.animationId);
        const fishLeft = Math.ceil(this.fishCount);
        this.showOverlay(
            'Victory!', 
            `You survived 5 minutes with ${fishLeft} fish remaining!`
        );
    }
    
    showOverlay(title, message) {
        document.getElementById('overlay-title').textContent = title;
        document.getElementById('overlay-message').textContent = message;
        document.getElementById('game-overlay').style.display = 'flex';
    }
    
    restart() {
        document.getElementById('game-overlay').style.display = 'none';
        
        // Reset game state
        this.fishCount = CONFIG.INITIAL_FISH_COUNT;
        this.timeRemaining = CONFIG.GAME_DURATION;
        this.hunger = 0;
        
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
    new Game();
});
