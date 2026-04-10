# Black Gold Blitz 🚁🛢️⚡

A **Top-Down 2D Arcade Shooter** with overhauled graphics, upgrade system, and deep mechanics — built with Vanilla JavaScript and the HTML5 Canvas API. Works on both desktop and mobile browsers.

## 🎮 Play Now

Open `index.html` in any modern browser — no server or build step required.

**Deployed automatically via GitHub Pages** with the included CI/CD pipeline.

## Controls

### Desktop
| Action | Input |
|---|---|
| Move | WASD / Arrow Keys |
| Aim | Mouse |
| Fire | Space / Left Mouse Button |
| Homing Missile | E / Right Mouse Button (requires 1000+ oil) |

### Mobile (Touch)
| Action | Input |
|---|---|
| Move | Virtual joystick (left half of screen) |
| Fire | Tap right-lower area |
| Homing Missile | Tap right-upper area (requires 1000+ oil) |

## Game Mechanics

### Oil Economy
Oil is your **health**, **currency**, and **power source**:

- **Health:** Reaching 0 oil ends the game. Taking damage spills oil.
- **Power:** 500+ oil unlocks **dual cannons**; 1000+ oil unlocks **homing missiles**.
- **Agility:** More oil = heavier helicopter = slightly slower movement.
- **Threat:** High oil triggers a higher **Wanted Level**, spawning elite enemies.

### Upgrade System ⬆️
Every **500 score** you earn an upgrade choice. Pick from 3 randomly offered abilities:

| Upgrade | Effect |
|---|---|
| ⚡ Afterburner | +20% movement speed per level (max 3) |
| 🛡️ Reinforced Hull | -25% damage taken per level (max 3) |
| 🔥 Rapid Fire | +30% fire rate per level (max 3) |
| 🌟 Spread Shot | Fire in spread pattern (max 2) |
| 🧲 Oil Magnet | +50% oil collection per level (max 3) |
| 🔮 Energy Shield | Auto-shield every 15s (max 2) |
| 💫 EMP Blast | Stun nearby enemies when hit (max 2) |
| 💥 Critical Strike | +15% crit chance, 2x damage (max 3) |
| 💚 Nano Repair | +3 oil/sec passive regen (max 3) |
| 🚀 Warhead Upgrade | +40% missile damage and speed (max 2) |

### Objectives
- Fly over neutral **oil rigs** to tether and capture them (hold position for 2 seconds).
- Captured rigs generate oil over time.
- Defend your rigs from enemy attacks — destroyed rigs revert to neutral.

### Enemies
| Type | Behavior |
|---|---|
| Drones | Quadcopter swarm, low damage, ram into you |
| Planes | Fast strafing runs with prop engines, fire while passing |
| Enemy Choppers | Full helicopter with rotors, match your movements, fire targeted projectiles |

### Wanted Level
Your wanted level increases with your oil reserves. Higher levels spawn more frequent and elite enemies.

## Graphics Features
- Detailed vehicle sprites with bezier-curve bodies, spinning rotors, propellers
- Oil rigs with structural legs, deck plates, derrick towers, animated cranes, flame stacks
- Dynamic animated water with wave patterns and caustic lighting
- Enhanced particles: fire, smoke, oil spill, muzzle flash, engine trails
- Screen shake on explosions and damage
- Floating damage text and score popups
- Shadow system for all airborne vehicles
- Glow effects on bullets, shields, and UI elements

## CI/CD
This project uses **GitHub Actions** to automatically deploy to **GitHub Pages** on every push to `main`.

## Tech Stack
- HTML5 Canvas
- Vanilla JavaScript (no frameworks or dependencies)
- Responsive design (adapts to any screen size)
- GitHub Actions CI/CD
