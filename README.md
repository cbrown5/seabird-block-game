# 🌊 Marine Ecology Games

Three educational games about marine ecosystems:

1. **🐦 [Seabird Foraging Game](https://www.seascapemodels.org/seabird-block-game)** - A puzzle game about seabird ecology and parental care
2. **🐟 [Ocean Survival Game](https://www.seascapemodels.org/seabird-block-game/ocean-game)** - An action-survival game about larval fish avoiding predators
3. **🚣 [Ocean Survey Data Collection Game](https://www.seascapemodels.org/seabird-block-game/river-game)** - An educational game about collecting balanced ecological survey data

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

### 🚣 Ocean Survey Data Collection Game (`river-game.html`)

An educational action game where you navigate a boat in the ocean to collect balanced ecological data samples from different habitat types.

#### Gameplay

- Control a boat using arrow keys, WASD, or touch/click controls
- Collect data samples from 4 different habitat types: Forest 🌳, Mountain 🏔️, Beach 🏖️, and Grassland 🌾
- Collect 5 samples of each habitat type to complete a level and progress
- Avoid crocodiles 🐊 that steal your collected data (2 samples per collision)
- Navigate through seaweed 🌿 that entangles and slows down your boat
- When entangled, your boat is more vulnerable to crocodile attacks

#### Features

- Progressive difficulty with more obstacles in higher levels
- Stationary habitats positioned throughout the ocean
- Visual feedback for game events displayed on canvas
- Level-based progression with increasing challenges
- Canvas-based rendering with emoji graphics
- Mobile-friendly touch controls
- Responsive design with window resize handling

## 🚀 Running the Games

1. Clone this repository
2. Open the desired game file in a web browser:
   - `index.html` for the Seabird Foraging Game
   - `ocean-game.html` for the Ocean Survival Game
   - `river-game.html` for the River Data Collection Game
3. Or run a local server: `python3 -m http.server 8000` and visit `http://localhost:8000`

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

### River Data Collection Game
- HTML5 Canvas for rendering
- Embedded CSS3 styling
- Vanilla JavaScript with game loop architecture
- Emoji-based graphics
- Touch and keyboard input support
- Self-contained single-file implementation

## 🎯 Educational Goals

Learn about:
- Seabird foraging behavior and navigation
- Parental care and chick feeding schedules  
- Impact of commercial fishing on marine ecosystems
- Resource competition in ocean environments
- Importance of balanced ecological data collection
- Habitat diversity and data sampling strategies
- Risk-reward decision making in field research
