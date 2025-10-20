# 🌊 Marine Ecology Games

Two educational games about marine ecosystems:

1. **🐦 [Seabird Foraging Game](https://www.seascapemodels.org/seabird-block-game)** - A puzzle game about seabird ecology and parental care
2. **🐟 [Ocean Survival Game](https://www.seascapemodels.org/seabird-block-game/ocean-game)** - An action-survival game about larval fish avoiding predators

## TODO, improvements

Seabird game - add levels (with increasing boats or reducing port distance) and rewards when level completed. Make it a bit easier at the start
Ocean survival game - Predator dynamcis need work, they are not chasing the fish. Larval fish should be more spread out as well. Add sounds and levels. 


## Games

### 🐦 Seabird Foraging Game (`index.html`)

A mobile-friendly educational puzzle game about seabird ecology, parental care, and marine ecosystem dynamics.

## 🎮 How to Play

### Game Phases

1. **Foraging Phase**: Guide your seabird to collect 3 fish by rotating directional arrows to create flight paths
2. **Incubation Phase**: Wait 5 seconds for your egg to hatch  
3. **Chick Care Phase**: Feed your chick 3 times, collecting 3 fish for each feeding within 10-second time limits

### Controls

- **Tap arrows** to rotate them clockwise
- **Tap fish** to send your seabird along the arrow path to collect them
- The seabird follows arrows from its nest and automatically returns home with catches

### Challenge

Autonomous fishing boats compete for the same fish! They spawn from the port, navigate directly to nearby fish, and return when their hold is full (3 fish capacity).

### 🐟 Ocean Survival Game (`ocean-game.html`)

A fast-paced action game inspired by Vampire Survivors where you control a school of 100 larval fish trying to survive in the ocean.

#### Gameplay

- Control a school of 100 larval fish using arrow keys or WASD
- Avoid jellyfish and predator fish that will attack your school
- Collect plankton to prevent starvation
- Survive for 5 minutes with at least 1 fish remaining to win!

#### Features

- Real-time flocking behavior for realistic fish school movement
- Multiple enemy types with different AI behaviors
- Hunger system requiring constant food collection
- Canvas-based graphics with smooth animations
- Keyboard controls (Arrow keys or WASD)

## 🚀 Running the Games

1. Clone this repository
2. Open `index.html` for the Seabird Foraging Game or `ocean-game.html` for the Ocean Survival Game in a web browser, or 
3. Run a local server: `python3 -m http.server 8000` and visit `http://localhost:8000`

## 📱 Mobile Optimized

- Portrait orientation design
- Touch-friendly controls  
- Responsive grid layout
- No scrolling required

## ⚙️ Configurable Parameters

The game includes easily adjustable settings in `game.js`:

- Grid dimensions (default 8x4)
- Timer durations (incubation: 5s, feeding: 10s)
- Fish requirements per phase
- Maximum boat count and capacity
- Boat movement speed
- Port location coordinates

## 🛠️ Technologies

### Seabird Foraging Game
- HTML5
- CSS3 with responsive design
- Vanilla JavaScript
- Emoji sprites for all game elements

### Ocean Survival Game
- HTML5 Canvas for rendering
- CSS3 for UI styling
- Vanilla JavaScript with object-oriented design
- Real-time animation and physics

## 🎯 Educational Goals

Learn about:
- Seabird foraging behavior and navigation
- Parental care and chick feeding schedules  
- Impact of commercial fishing on marine ecosystems
- Resource competition in ocean environments
