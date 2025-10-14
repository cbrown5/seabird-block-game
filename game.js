// Game configuration - easily adjustable parameters
const CONFIG = {
    GRID_WIDTH: 8,
    GRID_HEIGHT: 4,
    INCUBATION_TIME: 5000, // 5 seconds
    FEEDING_TIME: 10000, // 10 seconds per feeding
    FISH_NEEDED_FORAGING: 3,
    FISH_NEEDED_PER_FEEDING: 1,
    MAX_BOATS: 3,
    BOAT_CAPACITY: 3,
    BOAT_SPEED: 1000, // milliseconds per move
    PORT_LOCATION: { x: 0, y: 0 }, // configurable port spawn location
    NEST_LOCATION: { x: 7, y: 0 } // seabird nest location
};

// Arrow directions with their corresponding movement vectors
const ARROWS = {
    '↑': { dx: 0, dy: -1 },
    '↓': { dx: 0, dy: 1 },
    '←': { dx: -1, dy: 0 },
    '→': { dx: 1, dy: 0 },
    '↖': { dx: -1, dy: -1 },
    '↗': { dx: 1, dy: -1 },
    '↘': { dx: 1, dy: 1 },
    '↙': { dx: -1, dy: 1 }
};

const ARROW_ORDER = ['↑', '↗', '→', '↘', '↓', '↙', '←', '↖'];

const REFLECTION_QUESTIONS = [
    'How did the fishing boats change where you decided to forage?',
    'How does increasing fishing boats affect your foraging?',
    'How does moving the port closer to your nest affect your foraging?',
    'What might be some impacts of climate change on seabirds and their food sources?',
];

// Game phases
const PHASES = {
    FORAGING: 'foraging',
    INCUBATION: 'incubation',
    CHICK_CARE: 'chick_care'
};

class GameState {
    constructor() {
        this.grid = [];
        this.seabirdPosition = { ...CONFIG.NEST_LOCATION };
        this.boats = [];
        this.phase = PHASES.FORAGING;
        this.fishCollected = 0;
        this.feedingsCompleted = 0;
        this.timer = null;
        this.timerValue = 0;
        this.gameRunning = true;
        this.isSeabirdMoving = false;
        this.boatTimer = null;
        this.audioContext = null;
        this.soundConfig = {
            fishCatch: [
                { frequency: 880, duration: 0.18, wave: 'triangle', volume: 0.22 },
                { frequency: 1046.5, duration: 0.12, wave: 'sine', volume: 0.18, delay: 0.16 }
            ],
            eggLaid: [
                { frequency: 392, duration: 0.25, wave: 'sine', volume: 0.18 },
                { frequency: 523.25, duration: 0.25, wave: 'triangle', volume: 0.15, delay: 0.2 }
            ],
            eggHatched: [
                { frequency: 523.25, duration: 0.18, wave: 'square', volume: 0.16 },
                { frequency: 659.25, duration: 0.2, wave: 'triangle', volume: 0.18, delay: 0.18 },
                { frequency: 880, duration: 0.25, wave: 'sine', volume: 0.16, delay: 0.38 }
            ],
            gameOver: [
                { frequency: 392, duration: 0.4, wave: 'sawtooth', volume: 0.22 },
                { frequency: 261.63, duration: 0.5, wave: 'sawtooth', volume: 0.18, delay: 0.35 }
            ]
        };
        
        this.initializeGrid();
        this.startBoatSpawning();
        this.updateDisplay();
    }

    initializeGrid() {
        // Initialize empty grid
        this.grid = Array(CONFIG.GRID_HEIGHT).fill(null).map(() => 
            Array(CONFIG.GRID_WIDTH).fill(null)
        );

            // Place nest
            this.grid[CONFIG.NEST_LOCATION.y][CONFIG.NEST_LOCATION.x] = '🏝️';

            // Place port house
            this.grid[CONFIG.PORT_LOCATION.y][CONFIG.PORT_LOCATION.x] = '🏠';

        // Generate random arrows and fish
        this.generateContent();

        // Ensure nest icon matches current phase
        this.updateNestIcon();
    }

    getNestEmoji() {
        switch (this.phase) {
            case PHASES.INCUBATION:
                return '🥚';
            case PHASES.CHICK_CARE:
                return '🐣';
            default:
                return '🏝️';
        }
    }

    updateNestIcon() {
        this.grid[CONFIG.NEST_LOCATION.y][CONFIG.NEST_LOCATION.x] = this.getNestEmoji();
    }

    ensureAudioContext() {
        if (typeof window === 'undefined') return;
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;

        if (!this.audioContext) {
            this.audioContext = new AudioCtx();
        }

        if (this.audioContext.state === 'suspended') {
            this.audioContext.resume().catch(() => {});
        }
    }

    playSound(key) {
        const steps = this.soundConfig[key];
        if (!steps || !steps.length) {
            return;
        }

        this.ensureAudioContext();
        if (!this.audioContext) {
            return;
        }

        const ctx = this.audioContext;
        const now = ctx.currentTime;

        steps.forEach(step => {
            const duration = step.duration ?? 0.2;
            const delay = step.delay ?? 0;
            const startTime = now + delay;

            const oscillator = ctx.createOscillator();
            const gain = ctx.createGain();

            oscillator.type = step.wave || 'sine';
            oscillator.frequency.setValueAtTime(step.frequency, startTime);

            const volume = Math.min(Math.max(step.volume ?? 0.15, 0.001), 1);
            gain.gain.setValueAtTime(volume, startTime);
            gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

            oscillator.connect(gain).connect(ctx.destination);
            oscillator.start(startTime);
            oscillator.stop(startTime + duration);
        });
    }

    generateContent() {
        const arrowKeys = Object.keys(ARROWS);
        const emptyCells = [];

        // Find all empty cells (excluding nest and current seabird position)
        for (let y = 0; y < CONFIG.GRID_HEIGHT; y++) {
            for (let x = 0; x < CONFIG.GRID_WIDTH; x++) {
                if (!this.grid[y][x] && 
                    !(x === CONFIG.NEST_LOCATION.x && y === CONFIG.NEST_LOCATION.y) &&
                    !(x === CONFIG.PORT_LOCATION.x && y === CONFIG.PORT_LOCATION.y)) {
                    emptyCells.push({ x, y });
                }
            }
        }

        // Shuffle empty cells
        for (let i = emptyCells.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [emptyCells[i], emptyCells[j]] = [emptyCells[j], emptyCells[i]];
        }

        // Place fish (approximately 25% of empty cells)
        const fishCount = Math.floor(emptyCells.length * 0.1);
        for (let i = 0; i < fishCount && i < emptyCells.length; i++) {
            const { x, y } = emptyCells[i];
            this.grid[y][x] = '🐟';
        }

        // Fill remaining cells with random arrows (ensure good distribution)
        for (let i = fishCount; i < emptyCells.length; i++) {
            const { x, y } = emptyCells[i];
            const randomArrow = arrowKeys[Math.floor(Math.random() * arrowKeys.length)];
            this.grid[y][x] = randomArrow;
        }

        // Ensure there are enough fish for gameplay
        this.ensureMinimumFish();
    }

    ensureMinimumFish() {
        const currentFish = this.findAllFish().length;
        const minFish = Math.max(5, CONFIG.FISH_NEEDED_FORAGING + 2);
        
        if (currentFish < minFish) {
            // Add more fish to random empty cells
            const emptyCells = [];
            for (let y = 0; y < CONFIG.GRID_HEIGHT; y++) {
                for (let x = 0; x < CONFIG.GRID_WIDTH; x++) {
                    if (!this.grid[y][x] || ARROWS[this.grid[y][x]]) {
                        if (!(x === CONFIG.NEST_LOCATION.x && y === CONFIG.NEST_LOCATION.y) &&
                            !(x === CONFIG.PORT_LOCATION.x && y === CONFIG.PORT_LOCATION.y)) {
                            emptyCells.push({ x, y });
                        }
                    }
                }
            }
            
            // Shuffle and add fish
            for (let i = emptyCells.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [emptyCells[i], emptyCells[j]] = [emptyCells[j], emptyCells[i]];
            }
            
            const fishToAdd = minFish - currentFish;
            for (let i = 0; i < fishToAdd && i < emptyCells.length; i++) {
                const { x, y } = emptyCells[i];
                this.grid[y][x] = '🐟';
            }
        }
    }

    ensureFishAvailability() {
        if (this.findAllFish().length === 0) {
            this.regenerateAllGridContent();
            this.renderGrid();
        }
    }

    replaceBoatCaughtFish(x, y) {
        // Replace the fish at the given position with either a random arrow or another fish
        if ((x === CONFIG.NEST_LOCATION.x && y === CONFIG.NEST_LOCATION.y) ||
            (x === CONFIG.PORT_LOCATION.x && y === CONFIG.PORT_LOCATION.y)) {
            return; // Never replace the nest or port
        }

        const arrowKeys = Object.keys(ARROWS);
        // 25% chance for fish, 75% chance for arrow
        const shouldBeFish = Math.random() < 0.1;
        
        if (shouldBeFish) {
            this.grid[y][x] = '🐟';
        } else {
            const randomArrow = arrowKeys[Math.floor(Math.random() * arrowKeys.length)];
            this.grid[y][x] = randomArrow;
        }

        this.ensureFishAvailability();
    }

    regenerateAllGridContent() {
        // After seabird catches a fish, regenerate all grid content randomly
        const arrowKeys = Object.keys(ARROWS);
        
        for (let y = 0; y < CONFIG.GRID_HEIGHT; y++) {
            for (let x = 0; x < CONFIG.GRID_WIDTH; x++) {
                // Skip the nest location
                if ((x === CONFIG.NEST_LOCATION.x && y === CONFIG.NEST_LOCATION.y) ||
                    (x === CONFIG.PORT_LOCATION.x && y === CONFIG.PORT_LOCATION.y)) {
                    continue;
                }
                
                // 25% chance for fish, 75% chance for arrow
                const shouldBeFish = Math.random() < 0.1;
                
                if (shouldBeFish) {
                    this.grid[y][x] = '🐟';
                } else {
                    const randomArrow = arrowKeys[Math.floor(Math.random() * arrowKeys.length)];
                    this.grid[y][x] = randomArrow;
                }
            }
        }
        
        // Ensure minimum fish for gameplay
        this.ensureMinimumFish();

        // Refresh nest icon for current phase
        this.updateNestIcon();
    }

    rotateArrow(x, y) {
        if (this.isSeabirdMoving || !this.gameRunning) return false;

        const cell = this.grid[y][x];
        if (!ARROWS[cell]) return false;

        const currentIndex = ARROW_ORDER.indexOf(cell);
        const nextIndex = (currentIndex + 1) % ARROW_ORDER.length;
        this.grid[y][x] = ARROW_ORDER[nextIndex];

        this.renderGrid();
        return true;
    }

    findPathToFish(targetX, targetY) {
        if (this.grid[targetY][targetX] !== '🐟') return null;

        const startX = this.seabirdPosition.x;
        const startY = this.seabirdPosition.y;

        const isAtNest = startX === CONFIG.NEST_LOCATION.x && startY === CONFIG.NEST_LOCATION.y;

        if (isAtNest) {
            if (Math.abs(targetX - startX) <= 1 && Math.abs(targetY - startY) <= 1) {
                return [{ x: targetX, y: targetY }];
            }

            const neighbors = this.getAdjacentArrowCells(startX, startY);
            for (const neighbor of neighbors) {
                const path = this.traceArrowPath(neighbor.x, neighbor.y, targetX, targetY, new Set([`${startX},${startY}`]));
                if (path) {
                    return path;
                }
            }
            return null;
        }

        return this.traceArrowPath(startX, startY, targetX, targetY);
    }

    getAdjacentArrowCells(x, y) {
        const neighbors = [];
        for (const symbol of ARROW_ORDER) {
            const direction = ARROWS[symbol];
            const nextX = x + direction.dx;
            const nextY = y + direction.dy;

            if (!this.isValidPosition(nextX, nextY)) continue;

            const cell = this.grid[nextY][nextX];
            if (ARROWS[cell]) {
                neighbors.push({ x: nextX, y: nextY });
            }
        }
        return neighbors;
    }

    traceArrowPath(startX, startY, targetX, targetY, visited = new Set()) {
        const path = [];
        let currentX = startX;
        let currentY = startY;

        while (true) {
            const key = `${currentX},${currentY}`;
            if (visited.has(key)) return null;
            visited.add(key);

            path.push({ x: currentX, y: currentY });

            if (currentX === targetX && currentY === targetY) {
                return path;
            }

            const cell = this.grid[currentY][currentX];
            if (!ARROWS[cell]) {
                return null;
            }

            const { dx, dy } = ARROWS[cell];
            const nextX = currentX + dx;
            const nextY = currentY + dy;

            if (!this.isValidPosition(nextX, nextY)) {
                return null;
            }

            currentX = nextX;
            currentY = nextY;
        }
    }

    isValidPosition(x, y) {
        return x >= 0 && x < CONFIG.GRID_WIDTH && y >= 0 && y < CONFIG.GRID_HEIGHT;
    }

    async moveSeabirdToFish(targetX, targetY) {
        if (this.isSeabirdMoving || !this.gameRunning) return false;

        const path = this.findPathToFish(targetX, targetY);
        if (!path) {
            this.showFeedback('error', 'No valid path to fish!');
            return false;
        }

        this.ensureAudioContext();
        this.isSeabirdMoving = true;
        this.highlightPath(path);

        // Animate seabird movement along path
        for (const position of path) {
            await this.animateSeabirdMove(position.x, position.y);
            await this.delay(300);
        }

        // Collect the fish
        this.grid[targetY][targetX] = null;
        this.fishCollected++;
    this.playSound('fishCatch');
        this.showFeedback('success', 'Fish collected!');

        // Return to nest
        await this.animateSeabirdMove(CONFIG.NEST_LOCATION.x, CONFIG.NEST_LOCATION.y);
        this.seabirdPosition = { ...CONFIG.NEST_LOCATION };

        // After seabird catches fish, regenerate all grid content
        this.regenerateAllGridContent();

        this.clearPathHighlight();
        this.isSeabirdMoving = false;
        this.checkPhaseProgression();
        if (this.phase === PHASES.CHICK_CARE) {
            this.checkChickFeeding();
        }
        this.updateDisplay();

        return true;
    }

    highlightPath(path) {
        path.forEach(pos => {
            const cell = document.querySelector(`[data-x="${pos.x}"][data-y="${pos.y}"]`);
            if (cell) cell.classList.add('path-highlight');
        });
    }

    clearPathHighlight() {
        document.querySelectorAll('.path-highlight').forEach(cell => {
            cell.classList.remove('path-highlight');
        });
    }

    async animateSeabirdMove(x, y) {
        const oldCell = document.querySelector(`[data-x="${this.seabirdPosition.x}"][data-y="${this.seabirdPosition.y}"]`);
        const newCell = document.querySelector(`[data-x="${x}"][data-y="${y}"]`);

        if (oldCell && newCell) {
            oldCell.classList.remove('seabird');
            newCell.classList.add('seabird');
            newCell.classList.add('seabird-moving');
            
            this.seabirdPosition = { x, y };
            this.renderGrid();
            
            await this.delay(100);
            newCell.classList.remove('seabird-moving');
        }
    }

    checkPhaseProgression() {
        if (this.phase === PHASES.FORAGING && this.fishCollected >= CONFIG.FISH_NEEDED_FORAGING) {
            this.startIncubation();
        }
    }

    startIncubation() {
        this.phase = PHASES.INCUBATION;
        this.timerValue = CONFIG.INCUBATION_TIME / 1000;
        this.updateNestIcon();
        this.renderGrid();
        this.playSound('eggLaid');
        this.startTimer(() => {
            this.startChickCare();
        });
        this.updateDisplay();
    }

    startChickCare() {
        this.phase = PHASES.CHICK_CARE;
        this.feedingsCompleted = 0;
        this.fishCollected = 0;
        this.updateNestIcon();
        this.renderGrid();
        this.playSound('eggHatched');
        this.startFeedingTimer();
        this.updateDisplay();
    }

    startFeedingTimer() {
        this.timerValue = CONFIG.FEEDING_TIME / 1000;
        this.startTimer(() => {
            this.gameOver('Your chick starved! Feed it within the time limit.');
        });
    }

    startTimer(onComplete) {
        this.clearTimer();
        
        this.timer = setInterval(() => {
            this.timerValue--;
            this.updateDisplay();
            
            if (this.timerValue <= 0) {
                this.clearTimer();
                onComplete();
            }
        }, 1000);
    }

    clearTimer() {
        if (this.timer) {
            clearInterval(this.timer);
            this.timer = null;
        }
    }

    checkChickFeeding() {
        if (this.phase === PHASES.CHICK_CARE && this.fishCollected >= CONFIG.FISH_NEEDED_PER_FEEDING) {
            this.feedingsCompleted++;
            this.fishCollected = 0;
            
            if (this.feedingsCompleted >= 3) {
                this.gameWin();
            } else {
                this.showFeedback('success', `Feeding ${this.feedingsCompleted}/3 complete!`);
                this.startFeedingTimer();
            }
        }
    }

    gameWin() {
        this.gameRunning = false;
        this.clearTimer();
        this.clearAllBoatTimers();
        this.showOverlay('Victory!', 'You successfully raised a healthy seabird chick!', {
            questions: REFLECTION_QUESTIONS
        });
    }

    gameOver(message) {
        this.gameRunning = false;
        this.clearTimer();
        this.clearAllBoatTimers();
        this.playSound('gameOver');
        this.showOverlay('Game Over', message, {
            questions: REFLECTION_QUESTIONS
        });
    }

    showOverlay(title, message, options = {}) {
        document.getElementById('overlay-title').textContent = title;
        document.getElementById('overlay-message').textContent = message;

        const overlay = document.getElementById('game-overlay');
        const reflectionContainer = document.getElementById('overlay-reflection');
        const reflectionList = document.getElementById('reflection-list');

        if (reflectionContainer && reflectionList) {
            const questions = options.questions;
            if (Array.isArray(questions) && questions.length) {
                reflectionContainer.hidden = false;
                reflectionContainer.removeAttribute('hidden');
                reflectionList.innerHTML = '';
                questions.forEach(question => {
                    const li = document.createElement('li');
                    li.textContent = question;
                    reflectionList.appendChild(li);
                });
            } else {
                reflectionContainer.hidden = true;
                reflectionContainer.setAttribute('hidden', 'true');
                reflectionList.innerHTML = '';
            }
        }

        overlay.style.display = 'flex';
        overlay.setAttribute('aria-hidden', 'false');
    }

    hideOverlay() {
        const overlay = document.getElementById('game-overlay');
        const reflectionContainer = document.getElementById('overlay-reflection');
        const reflectionList = document.getElementById('reflection-list');

        if (reflectionContainer && reflectionList) {
            reflectionContainer.hidden = true;
            reflectionContainer.setAttribute('hidden', 'true');
            reflectionList.innerHTML = '';
        }

        overlay.style.display = 'none';
        overlay.setAttribute('aria-hidden', 'true');
    }

    showFeedback(type, message) {
        const instructions = document.getElementById('instructions');
        const originalText = instructions.textContent;
        
        instructions.textContent = message;
        instructions.className = `instructions ${type}-flash`;
        
        setTimeout(() => {
            instructions.textContent = this.getInstructionText();
            instructions.className = 'instructions';
        }, 2000);
    }

    getInstructionText() {
        switch (this.phase) {
            case PHASES.FORAGING:
                return 'Tap arrows to rotate them, then tap a fish to start foraging!';
            case PHASES.INCUBATION:
                return 'Your egg is incubating... wait for it to hatch!';
            case PHASES.CHICK_CARE:
                return 'Feed your chick! Collect 3 fish before time runs out!';
            default:
                return '';
        }
    }

    updateDisplay() {
        // Update phase indicator
        const phaseText = {
            [PHASES.FORAGING]: 'Phase 1: Foraging',
            [PHASES.INCUBATION]: 'Phase 2: Incubation',
            [PHASES.CHICK_CARE]: 'Phase 3: Chick Care'
        };
        document.getElementById('current-phase').textContent = phaseText[this.phase];

        // Update fish count
        const fishTarget = this.phase === PHASES.CHICK_CARE ? CONFIG.FISH_NEEDED_PER_FEEDING : CONFIG.FISH_NEEDED_FORAGING;
        document.getElementById('fish-count').textContent = `${this.fishCollected}/${fishTarget}`;

        // Update timer display
        const timerDisplay = document.getElementById('timer-display');
        if (this.phase === PHASES.INCUBATION || this.phase === PHASES.CHICK_CARE) {
            timerDisplay.style.display = 'flex';
            document.getElementById('timer-value').textContent = `${this.timerValue}s`;
        } else {
            timerDisplay.style.display = 'none';
        }

        // Update nest status
        const nestStatus = {
            [PHASES.FORAGING]: '🏝️ Empty Nest',
            [PHASES.INCUBATION]: '🥚 Incubating Egg',
            [PHASES.CHICK_CARE]: `🐣 Chick (Fed ${this.feedingsCompleted}/3)`
        };
        document.getElementById('nest-status').textContent = nestStatus[this.phase];

        // Update instructions
        document.getElementById('instructions').textContent = this.getInstructionText();
    }

    renderGrid() {
        const gridElement = document.getElementById('game-grid');
        gridElement.innerHTML = '';

        for (let y = 0; y < CONFIG.GRID_HEIGHT; y++) {
            for (let x = 0; x < CONFIG.GRID_WIDTH; x++) {
                const cell = document.createElement('div');
                cell.className = 'grid-cell';
                cell.dataset.x = x;
                cell.dataset.y = y;

                const content = this.grid[y][x];
                
                if (content) {
                    cell.textContent = content;
                    
                    if (ARROWS[content]) {
                        cell.classList.add('arrow');
                    } else if (content === '🐟') {
                        cell.classList.add('fish');
                    } else if (content === '🏝️' || content === '🥚' || content === '🐣') {
                        cell.classList.add('nest');
                    } else if (content === '🏠') {
                        cell.classList.add('port');
                    }
                }

                if (x === CONFIG.PORT_LOCATION.x && y === CONFIG.PORT_LOCATION.y) {
                    cell.classList.add('port');
                    if (!content) {
                        cell.textContent = '🏠';
                    }
                }

                // Check if seabird is at this position
                if (x === this.seabirdPosition.x && y === this.seabirdPosition.y) {
                    cell.classList.add('seabird');
                    if (content !== '🏝️' && content !== '🥚' && content !== '🐣' && content !== '🏠') {
                        cell.textContent = '🐦';
                    }
                }

                // Add boat rendering here when implemented
                const boat = this.boats.find(b => b.x === x && b.y === y);
                if (boat) {
                    cell.classList.add('boat');
                    cell.textContent = '🚤';
                }

                gridElement.appendChild(cell);
            }
        }
    }

    restart() {
        this.clearTimer();
        this.clearAllBoatTimers();
        this.hideOverlay();
        this.grid = [];
        this.seabirdPosition = { ...CONFIG.NEST_LOCATION };
        this.boats = [];
        this.phase = PHASES.FORAGING;
        this.fishCollected = 0;
        this.feedingsCompleted = 0;
        this.timerValue = 0;
        this.gameRunning = true;
        this.isSeabirdMoving = false;
        
        this.initializeGrid();
        this.startBoatSpawning();
        this.renderGrid();
        this.updateDisplay();
    }

    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    // Boat System Implementation
    startBoatSpawning() {
        this.boatTimer = setInterval(() => {
            if (this.gameRunning && this.boats.length < CONFIG.MAX_BOATS) {
                this.spawnBoat();
            }
        }, 3000); // Spawn attempt every 3 seconds
    }

    spawnBoat() {
        // Check if there are fish available
        const fishPositions = this.findAllFish();
        if (fishPositions.length === 0) {
            this.ensureFishAvailability();
            return;
        }

        // Create new boat at port
        const boat = {
            id: Date.now(),
            x: CONFIG.PORT_LOCATION.x,
            y: CONFIG.PORT_LOCATION.y,
            targetX: null,
            targetY: null,
            fishCount: 0,
            returning: false,
            moveTimer: null
        };

        // Find nearest fish
        this.assignBoatTarget(boat);
        
        if (boat.targetX !== null) {
            this.boats.push(boat);
            this.startBoatMovement(boat);
        }
    }

    findAllFish() {
        const fishPositions = [];
        for (let y = 0; y < CONFIG.GRID_HEIGHT; y++) {
            for (let x = 0; x < CONFIG.GRID_WIDTH; x++) {
                if (this.grid[y][x] === '🐟') {
                    fishPositions.push({ x, y });
                }
            }
        }
        return fishPositions;
    }

    assignBoatTarget(boat) {
        let fishPositions = this.findAllFish();
        if (fishPositions.length === 0) {
            this.ensureFishAvailability();
            fishPositions = this.findAllFish();
        }

        if (fishPositions.length === 0) {
            boat.targetX = null;
            boat.targetY = null;
            return;
        }

        // Find nearest fish
        let nearestFish = null;
        let minDistance = Infinity;

        fishPositions.forEach(fish => {
            const distance = Math.abs(boat.x - fish.x) + Math.abs(boat.y - fish.y);
            if (distance < minDistance) {
                minDistance = distance;
                nearestFish = fish;
            }
        });

        if (nearestFish) {
            boat.targetX = nearestFish.x;
            boat.targetY = nearestFish.y;
        }
    }

    startBoatMovement(boat) {
        boat.moveTimer = setInterval(() => {
            if (!this.gameRunning) {
                this.clearBoatTimer(boat);
                return;
            }

            this.moveBoat(boat);
        }, CONFIG.BOAT_SPEED);
    }

    moveBoat(boat) {
        if (boat.returning) {
            // Move back to port
            const dx = CONFIG.PORT_LOCATION.x - boat.x;
            const dy = CONFIG.PORT_LOCATION.y - boat.y;

            if (dx === 0 && dy === 0) {
                // Reached port, remove boat
                this.removeBoat(boat);
                return;
            }

            // Move one step toward port
            if (dx !== 0) {
                boat.x += dx > 0 ? 1 : -1;
            } else if (dy !== 0) {
                boat.y += dy > 0 ? 1 : -1;
            }
        } else {
            // Move toward target fish
            if (boat.targetX === null || boat.targetY === null) {
                this.assignBoatTarget(boat);
                if (boat.targetX === null) {
                    // No fish available, return to port
                    boat.returning = true;
                    return;
                }
            }

            const dx = boat.targetX - boat.x;
            const dy = boat.targetY - boat.y;

            if (dx === 0 && dy === 0) {
                // Reached target, collect fish if still there
                if (this.grid[boat.y][boat.x] === '🐟') {
                    // Replace the fish with random content instead of just removing it
                    this.replaceBoatCaughtFish(boat.x, boat.y);
                    boat.fishCount++;
                    
                    if (boat.fishCount >= CONFIG.BOAT_CAPACITY) {
                        // Boat is full, return to port
                        boat.returning = true;
                    } else {
                        // Look for another fish
                        this.assignBoatTarget(boat);
                        if (boat.targetX === null) {
                            boat.returning = true;
                        }
                    }
                } else {
                    // Fish was taken by seabird, find new target
                    this.assignBoatTarget(boat);
                    if (boat.targetX === null) {
                        boat.returning = true;
                    }
                }
            } else {
                // Move one step toward target
                if (Math.abs(dx) > Math.abs(dy)) {
                    boat.x += dx > 0 ? 1 : -1;
                } else {
                    boat.y += dy > 0 ? 1 : -1;
                }
            }
        }

        // Ensure boat stays within bounds
        boat.x = Math.max(0, Math.min(CONFIG.GRID_WIDTH - 1, boat.x));
        boat.y = Math.max(0, Math.min(CONFIG.GRID_HEIGHT - 1, boat.y));

        this.renderGrid();
    }

    removeBoat(boat) {
        this.clearBoatTimer(boat);
        const index = this.boats.findIndex(b => b.id === boat.id);
        if (index !== -1) {
            this.boats.splice(index, 1);
        }
        this.renderGrid();
    }

    clearBoatTimer(boat) {
        if (boat.moveTimer) {
            clearInterval(boat.moveTimer);
            boat.moveTimer = null;
        }
    }

    clearAllBoatTimers() {
        this.boats.forEach(boat => this.clearBoatTimer(boat));
        if (this.boatTimer) {
            clearInterval(this.boatTimer);
            this.boatTimer = null;
        }
    }
}

// Game instance and event handlers
let game;

function setupStartScreen() {
    const startScreen = document.getElementById('start-screen');
    const startButton = document.getElementById('start-button');
    const portSlider = document.getElementById('port-distance-slider');
    const portValue = document.getElementById('port-distance-value');
    const boatSlider = document.getElementById('boat-count-slider');
    const boatValue = document.getElementById('boat-count-value');
    const instructionsButton = document.getElementById('instructions-button');
    const instructionsModal = document.getElementById('instructions-modal');
    const instructionsClose = document.getElementById('instructions-close');
    const modalBackdrop = instructionsModal ? instructionsModal.querySelector('[data-close-modal]') : null;

    if (!startScreen || !startButton || !portSlider || !portValue || !boatSlider || !boatValue) {
        console.warn('Start screen elements are missing.');
        game = new GameState();
        game.renderGrid();
        return;
    }

    const closeInstructionsModal = () => {
        if (!instructionsModal) return;
        instructionsModal.classList.remove('active');
        instructionsModal.setAttribute('aria-hidden', 'true');
    };

    const openInstructionsModal = () => {
        if (!instructionsModal) return;
        instructionsModal.classList.add('active');
        instructionsModal.setAttribute('aria-hidden', 'false');
        const dialog = instructionsModal.querySelector('.modal-dialog');
        if (dialog) {
            try {
                dialog.focus({ preventScroll: true });
            } catch (error) {
                dialog.focus();
            }
        }
    };

    if (instructionsButton && instructionsModal) {
        instructionsButton.addEventListener('click', openInstructionsModal);
    }

    if (instructionsClose) {
        instructionsClose.addEventListener('click', closeInstructionsModal);
    }

    if (modalBackdrop) {
        modalBackdrop.addEventListener('click', closeInstructionsModal);
    }

    const handleEscapeKey = (event) => {
        if (event.key === 'Escape' && instructionsModal && instructionsModal.classList.contains('active')) {
            closeInstructionsModal();
        }
    };

    document.addEventListener('keydown', handleEscapeKey);

    const updatePortLabel = () => {
        const tiles = parseInt(portSlider.value, 10);
        const label = tiles === 1 ? 'tile' : 'tiles';
        portValue.textContent = `${tiles} ${label}`;
    };

    const updateBoatLabel = () => {
        const boats = parseInt(boatSlider.value, 10);
        if (boats === 0) {
            boatValue.textContent = 'No boats';
        } else {
            const label = boats === 1 ? 'boat' : 'boats';
            boatValue.textContent = `${boats} ${label}`;
        }
    };

    const defaultDistance = Math.max(1, CONFIG.NEST_LOCATION.x - CONFIG.PORT_LOCATION.x);
    portSlider.value = String(defaultDistance);
    updatePortLabel();

    boatSlider.value = String(CONFIG.MAX_BOATS);
    updateBoatLabel();

    portSlider.addEventListener('input', updatePortLabel);
    boatSlider.addEventListener('input', updateBoatLabel);

    startButton.addEventListener('click', () => {
        const distance = parseInt(portSlider.value, 10);
        const boatCount = parseInt(boatSlider.value, 10);

        CONFIG.PORT_LOCATION.x = Math.max(0, CONFIG.NEST_LOCATION.x - distance);
        CONFIG.PORT_LOCATION.y = 0;
        CONFIG.MAX_BOATS = boatCount;

        closeInstructionsModal();

        startScreen.classList.add('hidden');
        startScreen.setAttribute('aria-hidden', 'true');
        startScreen.style.display = 'none';

        game = new GameState();
        game.renderGrid();
    }, { once: true });
}

function setupGridListeners() {
    const grid = document.getElementById('game-grid');
    if (!grid) return;

    grid.addEventListener('click', handleGridClick);
    grid.addEventListener('touchstart', handleGridClick);
}

// Initialize game when page loads
document.addEventListener('DOMContentLoaded', () => {
    setupStartScreen();
    setupGridListeners();
});

function handleGridClick(event) {
    event.preventDefault();
    
    const cell = event.target.closest('.grid-cell');
    if (!cell || !game || !game.gameRunning || game.isSeabirdMoving) return;

    game.ensureAudioContext();

    const x = parseInt(cell.dataset.x);
    const y = parseInt(cell.dataset.y);
    const content = game.grid[y][x];

    if (ARROWS[content]) {
        // Rotate arrow
        game.rotateArrow(x, y);
    } else if (content === '🐟') {
        // Try to move seabird to fish
        game.moveSeabirdToFish(x, y);
    }
}

// Prevent default touch behaviors
document.addEventListener('touchmove', (e) => {
    e.preventDefault();
}, { passive: false });

document.addEventListener('touchstart', (e) => {
    if (e.target.classList.contains('grid-cell')) {
        e.preventDefault();
    }
}, { passive: false });