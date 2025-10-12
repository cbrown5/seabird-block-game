// Game configuration - easily adjustable parameters
const CONFIG = {
    GRID_WIDTH: 8,
    GRID_HEIGHT: 4,
    INCUBATION_TIME: 5000, // 5 seconds
    FEEDING_TIME: 10000, // 10 seconds per feeding
    FISH_NEEDED_FORAGING: 3,
    FISH_NEEDED_PER_FEEDING: 3,
    MAX_BOATS: 2,
    BOAT_CAPACITY: 3,
    BOAT_SPEED: 1000, // milliseconds per move
    PORT_LOCATION: { x: 0, y: 0 }, // configurable port spawn location
    NEST_LOCATION: { x: 7, y: 3 } // seabird nest location
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

        // Generate random arrows and fish
        this.generateContent();
    }

    generateContent() {
        const arrowKeys = Object.keys(ARROWS);
        const emptyCells = [];

        // Find all empty cells (excluding nest and current seabird position)
        for (let y = 0; y < CONFIG.GRID_HEIGHT; y++) {
            for (let x = 0; x < CONFIG.GRID_WIDTH; x++) {
                if (!this.grid[y][x] && 
                    !(x === CONFIG.NEST_LOCATION.x && y === CONFIG.NEST_LOCATION.y)) {
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
        const fishCount = Math.floor(emptyCells.length * 0.25);
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
        const minFish = Math.max(6, CONFIG.FISH_NEEDED_FORAGING + 2);
        
        if (currentFish < minFish) {
            // Add more fish to random empty cells
            const emptyCells = [];
            for (let y = 0; y < CONFIG.GRID_HEIGHT; y++) {
                for (let x = 0; x < CONFIG.GRID_WIDTH; x++) {
                    if (!this.grid[y][x] || ARROWS[this.grid[y][x]]) {
                        if (!(x === CONFIG.NEST_LOCATION.x && y === CONFIG.NEST_LOCATION.y)) {
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

    replaceBoatCaughtFish(x, y) {
        // Replace the fish at the given position with either a random arrow or another fish
        if (x === CONFIG.NEST_LOCATION.x && y === CONFIG.NEST_LOCATION.y) {
            return; // Never replace the nest
        }

        const arrowKeys = Object.keys(ARROWS);
        // 25% chance for fish, 75% chance for arrow
        const shouldBeFish = Math.random() < 0.25;
        
        if (shouldBeFish) {
            this.grid[y][x] = '🐟';
        } else {
            const randomArrow = arrowKeys[Math.floor(Math.random() * arrowKeys.length)];
            this.grid[y][x] = randomArrow;
        }
    }

    regenerateAllGridContent() {
        // After seabird catches a fish, regenerate all grid content randomly
        const arrowKeys = Object.keys(ARROWS);
        
        for (let y = 0; y < CONFIG.GRID_HEIGHT; y++) {
            for (let x = 0; x < CONFIG.GRID_WIDTH; x++) {
                // Skip the nest location
                if (x === CONFIG.NEST_LOCATION.x && y === CONFIG.NEST_LOCATION.y) {
                    continue;
                }
                
                // 25% chance for fish, 75% chance for arrow
                const shouldBeFish = Math.random() < 0.25;
                
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

        const visited = new Set();
        const path = [];
        
        let currentX = this.seabirdPosition.x;
        let currentY = this.seabirdPosition.y;

        while (true) {
            const key = `${currentX},${currentY}`;
            
            // Check if we've been here before (infinite loop)
            if (visited.has(key)) return null;
            visited.add(key);

            // Check if we reached the target
            if (currentX === targetX && currentY === targetY) {
                return path;
            }

            // Get current cell content
            const cell = this.grid[currentY][currentX];
            
            // If it's not an arrow (and not the starting nest), path is invalid
            if (!ARROWS[cell] && !(currentX === CONFIG.NEST_LOCATION.x && currentY === CONFIG.NEST_LOCATION.y)) {
                return null;
            }

            // If we're at the nest, we need to find the first arrow to follow
            if (currentX === CONFIG.NEST_LOCATION.x && currentY === CONFIG.NEST_LOCATION.y) {
                // Look for adjacent arrows
                let foundArrow = false;
                for (const direction of Object.values(ARROWS)) {
                    const nextX = currentX + direction.dx;
                    const nextY = currentY + direction.dy;
                    
                    if (this.isValidPosition(nextX, nextY) && ARROWS[this.grid[nextY][nextX]]) {
                        currentX = nextX;
                        currentY = nextY;
                        path.push({ x: currentX, y: currentY });
                        foundArrow = true;
                        break;
                    }
                }
                if (!foundArrow) return null;
                continue;
            }

            // Follow the arrow
            const direction = ARROWS[cell];
            const nextX = currentX + direction.dx;
            const nextY = currentY + direction.dy;

            // Check bounds
            if (!this.isValidPosition(nextX, nextY)) return null;

            currentX = nextX;
            currentY = nextY;
            path.push({ x: currentX, y: currentY });

            // Prevent infinite loops
            if (path.length > CONFIG.GRID_WIDTH * CONFIG.GRID_HEIGHT) return null;
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
        this.showFeedback('success', 'Fish collected!');

        // Return to nest
        await this.animateSeabirdMove(CONFIG.NEST_LOCATION.x, CONFIG.NEST_LOCATION.y);
        this.seabirdPosition = { ...CONFIG.NEST_LOCATION };

        // After seabird catches fish, regenerate all grid content
        this.regenerateAllGridContent();

        this.clearPathHighlight();
        this.isSeabirdMoving = false;
        this.checkPhaseProgression();
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
        this.startTimer(() => {
            this.startChickCare();
        });
        this.updateDisplay();
    }

    startChickCare() {
        this.phase = PHASES.CHICK_CARE;
        this.feedingsCompleted = 0;
        this.fishCollected = 0;
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
            this.updateDisplay();
        }
    }

    gameWin() {
        this.gameRunning = false;
        this.clearTimer();
        this.clearAllBoatTimers();
        this.showOverlay('Victory!', 'You successfully raised a healthy seabird chick!');
    }

    gameOver(message) {
        this.gameRunning = false;
        this.clearTimer();
        this.clearAllBoatTimers();
        this.showOverlay('Game Over', message);
    }

    showOverlay(title, message) {
        document.getElementById('overlay-title').textContent = title;
        document.getElementById('overlay-message').textContent = message;
        document.getElementById('game-overlay').style.display = 'flex';
    }

    hideOverlay() {
        document.getElementById('game-overlay').style.display = 'none';
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

        // Check chick feeding progress
        if (this.phase === PHASES.CHICK_CARE) {
            this.checkChickFeeding();
        }
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
                    } else if (content === '🏝️') {
                        cell.classList.add('nest');
                    }
                }

                // Check if seabird is at this position
                if (x === this.seabirdPosition.x && y === this.seabirdPosition.y) {
                    cell.classList.add('seabird');
                    if (content !== '🏝️') {
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
        if (fishPositions.length === 0) return;

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
        const fishPositions = this.findAllFish();
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

// Initialize game when page loads
document.addEventListener('DOMContentLoaded', () => {
    game = new GameState();
    game.renderGrid();
    
    // Add click/touch event listeners to grid
    document.getElementById('game-grid').addEventListener('click', handleGridClick);
    document.getElementById('game-grid').addEventListener('touchstart', handleGridClick);
});

function handleGridClick(event) {
    event.preventDefault();
    
    const cell = event.target.closest('.grid-cell');
    if (!cell || !game.gameRunning || game.isSeabirdMoving) return;

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