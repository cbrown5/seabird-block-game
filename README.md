# 🐦 Seabird Foraging Game

A mobile-friendly educational puzzle game about seabird ecology, parental care, and marine ecosystem dynamics.

TODO
Reduce number of fish on the field 
Add instructions on the first page
Add reflection questions at the end

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

## 🚀 Running the Game

1. Clone this repository
2. Open `index.html` in a web browser, or 
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

- HTML5
- CSS3 with responsive design
- Vanilla JavaScript
- Emoji sprites for all game elements

## 🎯 Educational Goals

Learn about:
- Seabird foraging behavior and navigation
- Parental care and chick feeding schedules  
- Impact of commercial fishing on marine ecosystems
- Resource competition in ocean environments