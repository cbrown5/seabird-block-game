Create a mobile-friendly educational seabird foraging game optimized for portrait orientation using HTML5, CSS, and JavaScript. The game teaches players about seabird ecology, parental care, and the impacts of commercial fishing on marine ecosystems through engaging gameplay mechanics.

**Core Game Mechanics**
Design an 8x4 grid-based puzzle game where players control a seabird navigating ocean currents to catch fish and raise offspring. Each grid cell displays either a directional arrow emoji (↑↓←→↖↗↘↙) or a fish emoji (🐟). Players tap grid cells to rotate arrows clockwise, creating flight paths from the seabird's nest to available fish. When a valid path exists, players tap a fish to trigger the seabird's flight along the arrow sequence, automatically returning home with the catch.

**Progressive Gameplay Structure**
Phase 1: Foraging - Seabird must collect exactly 3 fish to trigger egg laying
Phase 2: Incubation - 5-second countdown timer displays until egg hatches into chick
Phase 3: Chick Care - Feed chick 3 times within 10-second intervals per feeding, timer resets after each successful feeding, game ends if timer expires unfed

**Dynamic Challenge System**
Implement autonomous fishing boats that spawn from  a configurable port location at grid edge, navigate directly toward nearest fish regardless of arrow directions, and compete with the seabird for resources. Each boat carries a hold capacity of 3 fish before returning to port automatically.

**Technical Implementation Requirements**
Structure the codebase with easily adjustable parameters including grid dimensions (default 8x4), all timer durations (incubation, feeding deadlines), port spawn coordinates, maximum fishing boat count, boat cargo capacity, and boat movement speed multipliers. Ensure responsive design fits entirely within viewport without scrolling, uses emoji sprites for all game elements, implements touch-friendly tap targets, and provides clear visual feedback for all interactions.