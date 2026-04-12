# Black Gold Blitz — Improvement Plan

_Last updated: 2026-04-11_

---

## Status Legend
- `[ ]` Not started
- `[~]` In progress
- `[x]` Done

---

## Phase 1 — Core Gameplay Loop (Short Sessions Feel Good)

### 1. Bounty Contracts
**What:** Every 45-60s a random enemy is tagged with a bounty icon + pulsing glow. Kill it = large reward (oil + skip next upgrade cost).
**Why:** Creates a "hunting" pull inside the survival loop. Players take risks to chase bounties instead of playing passive.
**How:**
- State: `s.bountyTarget` (enemy ref), `s.bountyTimer`
- Logic in `enemyLogic.js` — pick random live enemy, assign `enemy.isBounty = true`
- On kill in `combatLogic.js` — pay out bounty reward, show floating text "BOUNTY CLAIMED"
- Visual in `drawEnemies.js` — rotating golden ring + pulsing corona around bounty target
- HUD indicator showing bounty target HP in `drawHUD.js`

### 2. Revenge Mechanic
**What:** When an enemy destroys a player rig, that specific attacker gets tagged "MARKED". Killing it gives 3× reward + 5s damage buff.
**Why:** Turns a frustrating loss into motivation. Converts negative emotion into drive.
**How:**
- When rig HP hits 0, find closest enemy within 120px → set `enemy.isMarked = true`
- On kill: check `enemy.isMarked` → apply `s.player.revengeActive = true` for 5s, 3× reward
- Visual: red skull icon above marked enemy, pulsing red ring

### 3. (Skipped — merged into #8) ~~Cursed Rigs~~

### 4. Momentum / Rampage Mode
**What:** After a 12-kill streak, enter Rampage: +40% fire rate, +25% move speed, kills give double oil. First hit breaks it.
**Why:** Creates a "protect your streak" skill layer. Makes high-kill moments feel electric.
**How:**
- Extend `s.killStreak` tracking in `combatLogic.js`
- At 12 streak: set `s.player.rampageActive = true`, `s.player.rampageTimer = 0`
- Rampage break on any damage received
- Visual: fiery aura on player, HUD rampage bar in `drawHUD.js`
- Audio: pitch shift on fire sound during rampage

### 5. Expanded Synergies (4 → 14)
**What:** Add 10 new upgrade synergies that fundamentally change how builds play.
**Why:** Only 4 synergies exist — the upgrade system feels shallow mid-run. More synergies = more runs feel unique.

**New synergies (prerequisites → effect):**
| Name | Prerequisites | Effect |
|------|--------------|--------|
| Chain Reaction | Explosive Rounds + Chain Lightning | Explosions arc lightning to nearby enemies |
| Blood Money | Vampire Rounds + Reckless | Vampire drain also steals rig income from enemies |
| Ghost Protocol | Reflex Dash + Shield | Dash grants 0.5s invisibility (enemies lose target) |
| Overkill | Critical Rounds + Piercing | Crits cause bullet to split into 2 on pierce |
| Overload | Black Hole + Napalm | Black Hole detonates leaving a full napalm field |
| Iron Storm | Flak Burst + Fortify | Fortify turrets fire flak patterns instead of single shots |
| Time Sniper | Time Warp + High-Caliber | Frozen enemies take 3× bullet damage |
| Oil Vortex | Black Hole + Oil Magnet | Black Hole pulls all nearby loot + oil drops to player |
| Shock Nova | EMP + Oil Nova | Oil Nova also EMPs all hit enemies for 2s |
| War Machine | Armor Plating + Burst Shot | Each burst hit reduces armor on enemy by stacking debuff |

**How:**
- Add to synergy definitions in `config.js`
- Each synergy adds a flag/modifier checked in `combatLogic.js` / `playerLogic.js`

### 6. Weapon Mutations
**What:** Taking the same upgrade 3× mutates it into an enhanced form with a new behavior.
**Why:** Rewards committing to a build. Creates "just one more upgrade" pull when you see a mutation is 1 pick away.

**Mutation table:**
| Base Upgrade | Mutation Name | Mutation Effect |
|-------------|--------------|----------------|
| Rapid Fire ×3 | Minigun Mode | Continuous fire, 0.8 oil/s while held, no cooldown |
| High-Caliber ×3 | Rail Cannon | Bullets pierce ALL enemies (not just piercing-count), deal +60% dmg |
| Napalm ×3 | Inferno | Napalm zones last 8s instead of 3.5s, spread on enemy death |
| Shield ×3 | Fortress | Shield absorbs 3 hits before recharging, recharge +2s |
| Repair ×3 | Regenerator | Heal 3 oil/s passively, also regenerate rig HP 2× faster |
| Oil Magnet ×3 | Oil Baron | All income +50%, but attract extra enemy attention (wanted +1) |

**How:**
- Track `upgrade.level` in `s.player.upgrades` (already exists)
- At level 3: replace upgrade card display with mutation variant
- Mutation flag stored as `upgrade.mutated = true`

### 7. Gold Rig Auction (Special Rigs)
**What:** Every 90s a "Gold Rig" spawns at a random map location — triple income, but arrives with an enemy squad already contesting it.
**Why:** Creates a focused battleground that breaks the "defend what I have" pattern. High-intensity fight for a clear prize.
**How:**
- New rig type `rigType = 'gold'` in `GameState.js`
- Auto-spawn escort squad (2-3 choppers) targeting it at spawn time
- Visual: bright yellow/gold rig with sparkle effects, "$$$" label
- Income `×3` while player-owned
- Spawn logic in `combatLogic.js` → `updateRigs`

### 8. Cursed Rigs
**What:** ~15% of rigs spawn as "Cursed" — 3× income but they emit a beacon that draws extra waves toward them.
**Why:** Forces active defense decisions. Rich players who capture cursed rigs must commit to defending them.
**How:**
- On rig spawn (in `GameState.js`): `rig.cursed = Math.random() < 0.15`
- If player-owned cursed rig: halve wave spawn spacing targeting that rig
- Visual: dark red/purple aura, flickering sigil, "⚠ CURSED" label
- HUD: cursed rig listed with warning

### 9. Score Multiplier Decay
**What:** Visible ×multiplier (1.0–3.0) that slowly decays when not killing. Killing pauses decay and raises it. Passive play = lower score.
**Why:** Punishes turtling behind rigs. Rewards aggressive, risky play. Creates constant pressure.
**How:**
- `s.scoreMult` starts at 1.0, decays 0.02/s, +0.15 per kill, cap 3.0
- Score earned = `base × s.scoreMult`
- HUD multiplier bar in `drawHUD.js` — green → yellow → red as it drops
- Flash animation when it drops a tier (1.0 → losing bracket)

### 10. Named Elite Enemies
**What:** At 3min, 6min, 10min a single named elite enemy spawns — unique look, unique behavior twist, unique death reward.
**Why:** Milestone moments that break up long sessions. "I finally killed the Leech" = memorable narrative.

**Elite roster:**
| Name | Appearance Time | Behavior | Death Reward |
|------|----------------|---------|-------------|
| The Leech | 3min | Targets player rigs, drains 15 oil/s per contact | +200 oil + rare upgrade |
| The Ghost | 6min | Invisible until firing, immune to homing missiles | Bounty card + ability charge |
| The Fortress | 8min | 3× HP, spawns a shield drone that must die first | +1 free stat point |
| The Tyrant | 10min | Commander that buffs ALL on-screen enemies 50% | Mass panic on death + upgrade skip |

**How:**
- `eliteSpawnTimes` array in `enemyLogic.js`
- Each elite: special AI state, visual, unique death handler in `combatLogic.js`

---

## Phase 2 — Economy Improvements

### E1. Rig Upgrades (On-Site Investment)
**What:** While standing on a player rig, hold E (0.5s) to spend oil on a permanent rig upgrade. 3 tiers per rig.
**Why:** Rigs feel passive — you capture them and walk away. This makes you care about specific rigs as investments.
**Upgrade tiers (cost per rig):**
- Tier 1 (150 oil): +50% income from this rig
- Tier 2 (350 oil): +Defensive turret (stronger than Fortify base), +100 max HP
- Tier 3 (700 oil): Rig becomes a "Refinery" — passively regenerates 1 oil/s for player regardless of rig HP
**How:**
- `rig.upgradeTier` (0-3) on player rigs
- Input: E key near own rig triggers upgrade if oil sufficient
- Visual: upgraded rigs get additional deck structures (visual tier indicators)

### E2. Black Market Events
**What:** Every 120s a "Black Market" event appears for 20s — spend 250+ oil for a random overpowered temporary buff (90s duration).
**Why:** An oil sink that rewards rich players. Creates exciting "do I spend it?" decisions.
**Black market items:**
- Nitro Fuel: +80% move speed, +60% fire rate for 90s
- Warhead Surplus: All bullets become miniature warheads for 60s
- Full Mobilization: All rigs temporarily double income for 90s, +2 turrets
- Hired Mercs: 3 friendly drones fight alongside you for 90s
**How:**
- New event type `blackmarket` in `updateEvents`
- Random item from pool shown on screen, timer ticks down
- Purchased via spacebar or click when HUD prompt is active

### E3. Oil Futures (Risk/Reward Market)
**What:** During Oil Market Spike events, player can "buy futures" — bet 100-500 oil. If the spike continues for 10s+, 2.5× return. If it crashes early, lose it.
**Why:** Adds strategic oil management. Rich players can gamble for explosive income.
**How:**
- Extend Oil Market event with futures state
- HUD: futures prompt appears during spike events
- Resolve on event end: payout or loss + floating text

### E4. Salvage Drones
**What:** Unlockable upgrade — spend 200 oil to deploy a salvage drone that collects nearby wrecks automatically for 60s.
**Why:** Wrecks currently require player detour to collect. Salvage drone removes friction while costing resource.
**How:**
- New upgrade card `Salvage Drone` (economy category)
- Logic: drone entity moves toward nearest uncollected wreck, collect on contact
- Visual: small green drone with collection beam

### E5. Supply Chain Bonus (Pipeline Rework)
**What:** Instead of manual pipeline building (P key), proximity-based territory now automatically grants income bonuses when rigs overlap territory. The pipeline mechanic is replaced by this visual territory system.
- 1 rig: base income
- 2 rigs within territory range: +40% income each
- 3 rigs in cluster: +80% income each + shared turret grid
- 4+ rigs: Supply Chain — passive 5 oil/s bonus, enemies drop 2× oil
**Visual change:** Territory areas (colored blobs) grow and visually merge/blend when rigs are close. The connecting glow between rigs replaces the pipeline line entirely.
**How:**
- Remove `drawPipelines()` call and `s.pipelines` array
- Expand `drawTerritories.js` — when 2+ player rigs within `TERRITORY_CLUSTER_RANGE`, draw a filled gradient bridge between the circles (convex hull or capsule shape)
- Cluster income already exists in `updateRigs` — just tie it to territory visual instead of pipeline

---

## Phase 3 — Enemy System Improvements

### EN1. Flanking Behavior
**What:** When a wave has 4+ enemies targeting the same rig, ~30% of them peel off to approach from a different angle (50-180° offset from the main group's direction).
**Why:** Currently enemies pile in from one direction, making defense trivial. Flanking forces player to watch all sides.
**How:**
- In `enemyLogic.js` during target assignment: count enemies targeting same rig
- If ≥4: mark 1-2 as `enemy.flankRole = true`, add angular offset to their approach vector
- Flankers circle wide before closing in (state machine: FLANK_APPROACH → FLANK_CLOSE)

### EN2. Faction Cooperation (Multi-Faction Assault)
**What:** At threat level 4+, if two different factions have ≥3 enemies each, they can temporarily cooperate against the player (stop fighting each other, coordinate a joint assault on the richest rig).
**Why:** The faction rivalry system is a liability for enemies right now. Flipping it to cooperation at high threat makes late-game feel genuinely dangerous.
**How:**
- `s.factionPact` — if set, factions in the pact don't trigger rivalry damage
- Triggered by: late game timer + multi-faction wave check in `enemyLogic.js`
- Duration: 30s, visual: shared colored ring around cooperating enemies
- Ends when one faction drops below 2 alive enemies

### EN3. Retreat & Regroup (Morale System)
**What:** Each enemy faction has a morale value (0-1). Heavy losses drop morale. At <0.3 morale, faction retreats off-screen and regroups — coming back 15s later with a larger, angrier wave.
**Why:** Creates rhythm in combat. After a big fight where you kill 10+ enemies fast, there's a 15s window of calm before the next surge. Tension→relief→tension loop.
**How:**
- `s.factionMorale[faction]` object, starts 1.0
- Each kill of that faction: -0.08 morale
- Morale recovers +0.01/s
- <0.3: set faction to `retreating` state — enemies flee off-screen, spawn regroup wave after 15s at 150% normal size

### EN4. Stealth Infiltrator Unit
**What:** New enemy type: Infiltrator. Invisible on minimap, very low HP, moves only when player isn't facing it. If it reaches a rig unchallenged, it disables that rig's turret for 20s.
**Why:** Creates a new threat vector that requires player awareness, not just firepower. Can't just sit behind rigs.
**How:**
- New enemy subtype `infiltrator` in `enemyLogic.js`
- Visible only within 150px OR when player is aiming near it
- Move AI: advance when `angleDiff(playerAim, angleToPlayer) > 0.8` (player looking away)
- On rig contact: set `rig.turretDisabled = true` for 20s

### EN5. Bomber Escort (Late-Game Only)
**What:** At 5min+, Bombers always arrive with a 2-fighter escort that shields them until the Bomber reaches drop distance.
**Why:** Bombers are currently easy to intercept. Escorts force the player to fight through a screen before killing the real threat.
**How:**
- Modify `spawnWave` bomber role: add escort drones with AI `target = bomber.escorts.includes(this)` style — they orbit the Bomber and intercept bullets heading toward it
- Escort AI: intercept bullets (SHIELD_INTERCEPT behavior) or body-block

### EN6. Commander Last Stand
**What:** When a Commander reaches <15% HP, instead of dying normally, it activates a 5s "Last Stand" — moves 2× speed, immune to slow effects, and calls in 3 emergency drones.
**Why:** Makes killing Commanders feel like a climactic moment, not just a stat check. Creates dangerous "finish it fast" urgency.
**How:**
- In `combatLogic.js` kill check: if `enemy.type === 'chopper' && enemy.isCommander && hp < 0.15 && !enemy.lastStand`
- Set `enemy.lastStand = true`, spawn 3 fast drones near it, immune to Time Warp for 5s
- Visual: red glow, screech audio cue

---

## Phase 4 — Abilities Rework

**Design goal:** Abilities should feel overpowered when used at the right moment, but require reading the battlefield to get that moment. They should stack with each other and with upgrades to create "combo" plays.

### A1. Ability Combo Window
**What:** Using two abilities within 2s of each other triggers a "combo" — the second ability gets a 50% power boost AND a unique synergy effect specific to that pair.
**Why:** Currently abilities are used in isolation whenever available. Combos reward intentional sequencing.

**Combo table:**
| First → Second | Synergy Effect |
|---------------|---------------|
| Black Hole → Time Warp | All pulled enemies are frozen mid-air, then explode for AoE dmg |
| Time Warp → Black Hole | Black Hole radius 2×, damage 3× (frozen enemies can't escape) |
| Time Warp → Oil Nova | Oil Nova hits ALL on-screen enemies (frozen = can't dodge) |
| Black Hole → Oil Nova | Napalm field spawns at Black Hole center and expands outward |
| Shield → Time Warp | Player is immune + all enemies freeze — 3s of free shooting window |

**How:**
- `s.player.lastAbilityTime`, `s.player.lastAbilityType`
- In ability trigger code (`playerLogic.js`): check if combo window active, apply power multiplier + special effect

### A2. Black Hole Rework (Feel Upgrade)
**Current:** Pull + damage in 300px radius, 60 oil cost, 18s cooldown.
**New:**
- Pull is stronger (enemies can't escape once caught if <50% HP)
- Center of Black Hole spawns a 1s "micro singularity" — enemies that die inside explode for chain AoE
- If Overload synergy (Black Hole + Napalm): singularity leaves a 5s napalm field
- If Oil Vortex synergy (Black Hole + Oil Magnet): all loot + oil drops in 500px pulled to player
**Cost bump:** 80 oil (was 60) to balance the power increase.

### A3. Time Warp Rework (Feel Upgrade)
**Current:** Stun all on-screen enemies for 4s, 12s cooldown.
**New:**
- Stun duration scales: 4s base + 1s per level of any Mobility upgrade owned
- While active: player fire rate +50% (you're outside time), bullets travel 2× speed
- If Time Sniper synergy (Time Warp + High-Caliber): enemies frozen take 3× damage
- Cooldown: 15s (slight increase — it's now stronger)

### A4. New Ability: Airstrike (Unlockable)
**What:** Unlockable via milestone. Mark a target location, 2s delay, then 5 bombs rain in a line across 400px. Each bomb: 80dmg, 60px AoE, spawns fire.
**Why:** Provides area-denial play. Synergizes with Black Hole (pull enemies → airstrike). Feels massively powerful on a dense wave.
**Unlock:** Score 8000 milestone reward.
**Cost:** 120 oil, 25s cooldown.
**Synergy with Black Hole:** If enemies are in Black Hole pull zone, airstrike auto-targets the Black Hole center.

### A5. New Ability: Overclock (Unlockable)
**What:** Unlockable upgrade. 5s burst: fire rate 3×, bullets cost 0 oil, unlimited ammo. After 5s: 3s cooldown where fire rate is 50% (reload penalty).
**Why:** Designed for the "rampage" feel. Overpowered in a burst, predictable window, skill is timing it to a wave.
**Unlock:** Buy Rapid Fire upgrade × 2.
**Synergy with Rampage:** If used during Rampage, extends Rampage by 3s.

### A6. Ability Resource: Charge System
**What:** Add an "Ability Charge" resource (0-3 charges). Charges fill over 20s each. Abilities cost 1 charge instead of/in addition to oil. Some mechanics (bounty kill, revenge kill, Rampage break) restore 1 charge instantly.
**Why:** Decouples ability usage from oil economy. Currently abilities compete with bullets for oil, which discourages using them. Charge system means you ALWAYS have an ability ready when you earn it.
**How:**
- `s.player.abilityCharges` (0-3), `s.player.chargeTimer`
- Charge restored on: bounty kill, revenge kill, elite kill, wave surge end
- HUD: 3 charge pips shown next to ability icons

---

## Phase 5 — Territory Visual Rework (Pipeline Replacement)

**Goal:** Remove the manual pipeline line visual. Replace with organic territory areas that grow from rigs, visually merge when rigs are close, and communicate the cluster bonus through color density/shape.

### T1. Merged Territory Rendering
**What:** When two player rigs are within `TERRITORY_CLUSTER_RANGE`, draw a filled "bridge" gradient between their territory circles, making them look like one continuous territory blob.
**How:**
- In `drawTerritories.js`: for each close pair, draw a capsule/convex hull shape filled with the same radial gradient color
- Capsule = two circles + rectangle connecting them, all same green fill with alpha
- Bridge alpha scales with proximity (0 at max range, full at 0.5× range)
- Remove the dashed line — the territory fill IS the connection indicator
- Keep the midpoint bonus glow and rotating arc (they already exist, just remove the line)

### T2. Territory Tiers (Visual Density)
**What:** Territory alpha/intensity scales with the upgrade tier of the rig (from E1 above). Tier 3 "Refinery" rigs have a bright, pulsing territory.
**Tier visuals:**
- No upgrade: soft, faint green aura (current)
- Tier 1: brighter, slightly larger radius
- Tier 2: adds a slow particle emission (oil bubbles rising)
- Tier 3 Refinery: gold-green color shift, bright pulsing, visible from minimap

### T3. Minimap Territory
**What:** Show colored blobs on minimap for player territories instead of just rig dots.
**How:**
- In `drawHUD.js` minimap section: draw small filled circles at rig positions scaled to territory size
- Low alpha so minimap stays readable
- Pipeline lines on minimap also removed

---

## Implementation Order (Suggested)

1. **T1** — Territory visual rework (visual-only change, low risk, high impact first impression)
2. **9** — Score multiplier decay (small state change, big feel improvement)
3. **1** — Bounty contracts (new mechanic, single enemy tag system)
4. **2** — Revenge mechanic (simple, adds emotion)
5. **4** — Rampage mode (extends streak system already in place)
6. **E5** — Pipeline removal / territory economy merge (cleanup + redesign)
7. **5** — New synergies (config additions, mostly mechanical)
8. **A1** — Ability combo window (sequencing logic)
9. **A2, A3** — Ability reworks (Black Hole + Time Warp feel upgrade)
10. **7, 8** — Gold Rig + Cursed Rig (new rig types)
11. **6** — Weapon mutations (requires tracking upgrade levels already done)
12. **10** — Named elites (biggest content addition)
13. **EN1-EN6** — Enemy behavior upgrades (systemic changes)
14. **E1-E4** — Economy depth (late additions, balance-sensitive)
