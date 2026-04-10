# Black Gold Blitz 🚁🛢️

A **Top-Down 2D Arcade Shooter** built with Vanilla JavaScript and the HTML5 Canvas API. Works on both desktop and mobile browsers.

## Play

Open `index.html` in any modern browser — no server or build step required.

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

### Objectives
- Fly over neutral **oil rigs** to tether and capture them (hold position for 2 seconds).
- Captured rigs generate oil over time.
- Defend your rigs from enemy attacks — destroyed rigs revert to neutral.

### Enemies
| Type | Behavior |
|---|---|
| **Drones** | Swarm behavior, low damage, ram into you |
| **Planes** | Fast strafing runs across the screen, fire while passing |
| **Enemy Choppers** | Match your movements, fire targeted projectiles |

### Wanted Level (★)
Your wanted level increases with your oil reserves. Higher levels spawn more frequent and elite enemies.

## Tech Stack
- HTML5 Canvas
- Vanilla JavaScript (no frameworks or dependencies)
- Responsive design (adapts to any screen size)