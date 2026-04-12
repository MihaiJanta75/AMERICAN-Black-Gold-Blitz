import { STAT_MAX } from './constants.js';

/* ===== STAT SYSTEM CONFIG ===== */
export const STAT_NAMES = [
  "Health Regen", "Max Health", "Body Damage", "Bullet Speed",
  "Bullet Penetration", "Bullet Damage", "Reload", "Movement Speed"
];
export const STAT_KEYS = [
  "healthRegen", "maxHealth", "bodyDamage", "bulletSpeed",
  "bulletPenetration", "bulletDamage", "reload", "moveSpeed"
];
export const STAT_COLORS = [
  "#55ff55", "#ff5555", "#cc66ff", "#00ccff",
  "#ffcc00", "#ff6644", "#ff8800", "#44ccff"
];
export const STAT_ICONS = ["♥", "♦", "☠", "»", "◆", "✦", "⟳", "⚡"];

/* ===== FACTION COLORS / TIER SYSTEM =====
 * Tier = power level. Red = weakest entry enemy, Purple = endgame elite.
 * Higher-tier enemies are tougher AND bring lower-tier escorts. ===== */
export const FACTIONS = {
  red:    { tier: 1, name: "Crimson", body: "#cc2222", accent: "#ff4444", dark: "#991111", glow: "#ff6644" },
  yellow: { tier: 2, name: "Amber",   body: "#cc8800", accent: "#ffcc00", dark: "#996600", glow: "#ffaa22" },
  blue:   { tier: 3, name: "Cobalt",  body: "#2244cc", accent: "#4488ff", dark: "#112299", glow: "#4466ff" },
  purple: { tier: 4, name: "Violet",  body: "#7722aa", accent: "#aa44ff", dark: "#551188", glow: "#cc66ff" },
};
export const FACTION_KEYS = Object.keys(FACTIONS);

/* Tier stat multipliers — higher tier = tougher and worth more */
export const TIER_MULTS = {
  1: { hp: 1.0,  speed: 1.0,  score: 1.0  },
  2: { hp: 1.3,  speed: 1.18, score: 1.5  },
  3: { hp: 1.75, speed: 1.38, score: 2.2  },
  4: { hp: 2.6,  speed: 1.62, score: 3.5  },
};

/* Factions by tier (for picking escorts and unlocking by phase) */
export const FACTION_BY_TIER = { 1: 'red', 2: 'yellow', 3: 'blue', 4: 'purple' };

/* ===== AI UPGRADE DEFINITIONS ===== */
export const AI_UPGRADE_DEFS = [
  { key: 'reinforced_hulls',   name: 'Reinforced Hulls',   icon: '🔩', desc: '+30% HP',                    color: '#88aacc' },
  { key: 'boosted_engines',    name: 'Boosted Engines',    icon: '⚡', desc: '+22% speed',                  color: '#ffcc44' },
  { key: 'explosive_payloads', name: 'Explosive Payloads', icon: '💥', desc: 'Rig hits deal splash damage',  color: '#ff6644' },
  { key: 'berserker_chip',     name: 'Berserker Chip',     icon: '🔴', desc: 'Low HP → rage speed surge',   color: '#ff3344' },
  { key: 'shield_protocol',    name: 'Shield Protocol',    icon: '🔵', desc: '25% of drones spawn shielded', color: '#4488ff' },
  { key: 'hive_overclock',     name: 'Hive Overclock',     icon: '🧠', desc: 'Commander aura & buff +50%',  color: '#aa44ff' },
];

/* ===== LOOT TYPES ===== */
export const LOOT_TYPES = {
  xp_small:   { color: "#44ffcc", glow: "#22ddaa", radius: 5,  value: 10,  type: "xp" },
  xp_medium:  { color: "#44ff88", glow: "#22dd66", radius: 7,  value: 25,  type: "xp" },
  xp_large:   { color: "#88ff44", glow: "#66dd22", radius: 9,  value: 60,  type: "xp" },
  oil_small:  { color: "#222",    glow: "#555",    radius: 6,  value: 6,   type: "oil" },
  oil_large:  { color: "#111",    glow: "#444",    radius: 9,  value: 16,  type: "oil" },
  pow_speed:  { color: "#44ccff", glow: "#22aaff", radius: 10, duration: 8,  type: "powerup", effect: "speed",  label: "SPEED!" },
  pow_damage: { color: "#ff4444", glow: "#ff2222", radius: 10, duration: 8,  type: "powerup", effect: "damage", label: "DAMAGE!" },
  pow_shield: { color: "#aa44ff", glow: "#8822dd", radius: 10, duration: 10, type: "powerup", effect: "shield", label: "SHIELD!" },
  pow_magnet: { color: "#ffcc00", glow: "#ddaa00", radius: 10, duration: 12, type: "powerup", effect: "magnet", label: "MAGNET!" },
};

/* ===== UPGRADE CATEGORY COLORS ===== */
export const UPGRADE_CATEGORIES = {
  firepower:  { label: 'FIREPOWER',  color: '#ff4444' },
  defense:    { label: 'DEFENSE',    color: '#6699ff' },
  economy:    { label: 'ECONOMY',    color: '#44ff88' },
  mobility:   { label: 'MOBILITY',   color: '#ffcc44' },
  special:    { label: 'SPECIAL',    color: '#aa44ff' },
  stat:       { label: 'STAT UP',    color: '#aaccff' },
  wildcard:   { label: 'WILDCARD',   color: '#ff44ff' },
  weapon:     { label: 'WEAPON',     color: '#ffaa00' },
  companion:  { label: 'COMPANION',  color: '#44ccff' },
  chaos:      { label: 'CHAOS',      color: '#ff44aa' },
};

/* Rarity weights for card picker: common 60%, rare 25%, legendary 10%, wildcard 5% */
export const RARITY_COLORS = {
  common:    '#aaaacc',
  rare:      '#ffcc00',
  legendary: '#ff44ff',
  wildcard:  '#ff44ff',
};
export const RARITY_LABELS = {
  common:    'COMMON',
  rare:      'RARE',
  legendary: 'LEGENDARY',
};

/* ===== UPGRADE DEFINITIONS ===== */
export const UPGRADES = {
  // ── FIREPOWER (stackable — small per-stack bonuses) ────────────────────────
  rapid_fire:      { name: "Rapid Fire",      desc: "+5% fire rate per stack",          icon: "🔫", color: "#ff6644", category: 'firepower', maxLevel: 99, rarity: 'common' },
  high_caliber:    { name: "High-Caliber",    desc: "+10% bullet damage per stack",     icon: "🎯", color: "#ff2244", category: 'firepower', maxLevel: 99, rarity: 'rare' },
  burst_shot:      { name: "Burst Shot",      desc: "+1 extra bullet fired per stack",  icon: "✴", color: "#ffaa44", category: 'firepower', maxLevel: 99, rarity: 'common' },
  spread_shot:     { name: "Spread Shot",     desc: "Fan burst: +1 bullet per stack",   icon: "🌟", color: "#ffcc00", category: 'firepower', maxLevel: 99, rarity: 'common' },
  critical:        { name: "Critical Strike", desc: "+5% crit chance per stack",        icon: "💥", color: "#ff4444", category: 'firepower', maxLevel: 99, rarity: 'common' },
  piercing:        { name: "Piercing Rounds", desc: "Bullets pierce +1 target",         icon: "⟐",  color: "#ff8844", category: 'firepower', maxLevel: 99, rarity: 'common' },
  chain_lightning: { name: "Chain Lightning", desc: "Bullets arc to nearby foes",       icon: "⚡", color: "#88ffff", category: 'firepower', maxLevel: 99, rarity: 'rare' },
  napalm:          { name: "Napalm Rounds",   desc: "Bullets leave burning fire zones", icon: "🔥", color: "#ff6622", category: 'firepower', maxLevel: 99, rarity: 'rare' },
  warhead:         { name: "Warhead",         desc: "Missiles become AoE bombs: +10% dmg/stack", icon: "💣", color: "#ff4400", category: 'firepower', maxLevel: 99, rarity: 'rare', rare: true },
  explosive_rounds:{ name: "Explosive Rounds",desc: "+5% explosion damage per stack",   icon: "💥", color: "#ff6600", category: 'firepower', maxLevel: 99, rarity: 'common' },
  vampire_rounds:  { name: "Vampire Rounds",  desc: "+0.3 oil restored per bullet hit", icon: "🩸", color: "#cc1144", category: 'firepower', maxLevel: 99, rarity: 'common' },
  flak_burst:      { name: "Flak Burst",      desc: "Each shot fires close-range pellets", icon: "🌪", color: "#ffaa66", category: 'firepower', maxLevel: 99, rarity: 'rare' },

  // ── DEFENSE ───────────────────────────────────────────────────────────────
  shield:          { name: "Energy Shield",   desc: "Auto-shield; stacks reduce cooldown", icon: "🔮", color: "#aa44ff", category: 'defense',   maxLevel: 99, rarity: 'rare' },
  emp:             { name: "EMP Blast",       desc: "Stun burst when you get hit; stacks widen radius", icon: "💫", color: "#44ffff", category: 'defense', maxLevel: 99, rarity: 'common' },
  armor_plating:   { name: "Armor Plating",   desc: "-6% damage taken per stack",       icon: "🛡", color: "#88aacc", category: 'defense',   maxLevel: 99, rarity: 'common' },
  counter_attack:  { name: "Counter-Attack",  desc: "+8% dmg for 3s after hit per stack", icon: "⚔", color: "#ff4488", category: 'defense',  maxLevel: 99, rarity: 'common' },
  repair:          { name: "Nano Repair",     desc: "+2 oil/sec passive regen per stack", icon: "💚", color: "#44ff88", category: 'defense',   maxLevel: 99, rarity: 'common' },
  iron_will:       { name: "Iron Will",       desc: "+0.25s invincibility after hit",    icon: "🪖", color: "#8899cc", category: 'defense',   maxLevel: 99, rarity: 'common' },

  // ── MOBILITY ──────────────────────────────────────────────────────────────
  speed_boost:     { name: "Speed Boost",     desc: "+6% move speed per stack",         icon: "💨", color: "#ffee44", category: 'mobility',  maxLevel: 99, rarity: 'common' },
  reflex_dash:     { name: "Reflex Dash",     desc: "-0.4s dash cooldown per stack",    icon: "🔄", color: "#44ccff", category: 'mobility',  maxLevel: 99, rarity: 'common' },
  time_warp:       { name: "Time Warp",       desc: "Q: stun on-screen enemies 4s. Stack: +1s stun, -2s cooldown", icon: "⏱", color: "#aa88ff", category: 'mobility',  maxLevel: 5, rarity: 'rare', rare: true },

  // ── ECONOMY ───────────────────────────────────────────────────────────────
  oil_magnet:      { name: "Oil Magnet",      desc: "+10% oil income per stack",        icon: "🧲", color: "#88ff44", category: 'economy',   maxLevel: 99, rarity: 'common' },
  overcharge:      { name: "Overcharge",      desc: ">80% oil: +8% faster fire rate",   icon: "🔋", color: "#ffdd44", category: 'economy',   maxLevel: 99, rarity: 'common' },
  reckless:        { name: "Reckless",        desc: "<30% oil: +8% bullet damage",      icon: "☠",  color: "#ff2244", category: 'economy',   maxLevel: 99, rarity: 'common' },
  fortify:         { name: "Fortify Rigs",    desc: "Owned rigs fire defensive turrets; stacks add turrets", icon: "🏭", color: "#aacc88", category: 'economy', maxLevel: 99, rarity: 'rare' },
  xp_boost:        { name: "Knowledge",       desc: "+8% XP gain per stack",            icon: "📖", color: "#ddddff", category: 'economy',   maxLevel: 99, rarity: 'common' },
  supply_network:  { name: "Supply Network",  desc: "+0.8 oil/s bonus per owned rig",   icon: "🔗", color: "#44ddaa", category: 'economy',   maxLevel: 99, rarity: 'common' },

  // ── SPECIAL (rare) ────────────────────────────────────────────────────────
  orbital:         { name: "Orbital Strike",  desc: "Auto-turret orbits player; stacks add turrets", icon: "⊕", color: "#66ccff", category: 'special', maxLevel: 99, rarity: 'rare' },
  oil_nova:        { name: "Oil Nova",        desc: "Kills spray burning oil; stacks widen radius", icon: "💦", color: "#dd8800", category: 'special', maxLevel: 99, rarity: 'rare' },
  missile_boost:   { name: "Missile Boost",   desc: "+10% missile dmg & speed per stack", icon: "🚀", color: "#ff6600", category: 'special', maxLevel: 99, rarity: 'common' },
  black_hole:      { name: "Black Hole Bomb", desc: "B: costs 60 oil, pull+damage 300px. Stack: +20px radius, -2s cooldown", icon: "🕳", color: "#8844ff", category: 'special', maxLevel: 5, rarity: 'rare', rare: true },

  // ── STAT CARDS ──────────────────────────────────────────────────────────
  stat_speed:      { name: "Quick Reflexes",     desc: "+4% move speed per stack",          icon: "⚡", color: "#ffee88", category: 'stat', maxLevel: 99, rarity: 'common' },
  stat_armor:      { name: "Titanium Hull",       desc: "-4% damage taken per stack",        icon: "🛡", color: "#aaccff", category: 'stat', maxLevel: 99, rarity: 'common' },
  stat_health:     { name: "Reinforced Tank",     desc: "+100 max oil per stack",            icon: "🛢", color: "#44ff88", category: 'stat', maxLevel: 99, rarity: 'common' },
  stat_regen:      { name: "Oil Seal",            desc: "+1.5 oil/s passive regen per stack", icon: "💧", color: "#44ddaa", category: 'stat', maxLevel: 99, rarity: 'common' },
  stat_reload:     { name: "Rapid Cycling",       desc: "-4% reload time per stack",         icon: "⟳",  color: "#ffaa44", category: 'stat', maxLevel: 99, rarity: 'common' },
  stat_bullet_spd: { name: "Velocity Rounds",     desc: "+8% bullet speed per stack",        icon: "»",  color: "#44ccff", category: 'stat', maxLevel: 99, rarity: 'common' },
  stat_bullet_dmg: { name: "Dense Slugs",         desc: "+8% bullet damage per stack",       icon: "✦",  color: "#ff8844", category: 'stat', maxLevel: 99, rarity: 'common' },
  stat_pierce:     { name: "Penetration Rifling", desc: "Bullets pierce +1 more target",     icon: "◆",  color: "#cc88ff", category: 'stat', maxLevel: 99, rarity: 'rare' },

  // ── WEAPON CARDS (always one slot per level-up) ──────────────────────────
  weapon_dual:        { name: "Dual Cannon",      desc: "Fire 2 bullets side-by-side. Stack: +10% dmg & fire rate", icon: "🔫", color: "#ffaa00", category: 'weapon', maxLevel: 99, rarity: 'common' },
  weapon_triple:      { name: "Triple Cannon",    desc: "Fire 3 spread bullets. Stack: +8% dmg", icon: "🔫", color: "#ffbb22", category: 'weapon', maxLevel: 99, rarity: 'common' },
  weapon_shotgun:     { name: "Shotgun Blast",    desc: "6 pellets in a cone. Stack: +8% dmg, +1 pellet/3 stacks", icon: "💥", color: "#ff8844", category: 'weapon', maxLevel: 99, rarity: 'common' },
  weapon_sniper:      { name: "Sniper Rifle",     desc: "Single piercing shot, 3× dmg, slow fire. Stack: +12% dmg", icon: "🎯", color: "#44aaff", category: 'weapon', maxLevel: 99, rarity: 'rare' },
  weapon_machinegun:  { name: "Machine Gun",      desc: "8 bullets per burst — blazing fast. Stack: +6% fire rate", icon: "⚙", color: "#ff6622", category: 'weapon', maxLevel: 99, rarity: 'rare' },
  weapon_missile:     { name: "Missile Launcher", desc: "Main fire becomes homing missiles. Stack: +10% dmg", icon: "🚀", color: "#ff4400", category: 'weapon', maxLevel: 99, rarity: 'rare' },
  weapon_rocket:      { name: "Rocket Barrage",   desc: "3 rockets in a fan, 40px AoE. Stack: +10% dmg", icon: "💣", color: "#ff6600", category: 'weapon', maxLevel: 99, rarity: 'rare' },
  weapon_grenade:     { name: "Grenade Launcher", desc: "Bouncing grenade, 60px AoE. Stack: +10% dmg, +1 bounce/3 stacks", icon: "🧨", color: "#ff2200", category: 'weapon', maxLevel: 99, rarity: 'legendary' },
  weapon_chain_gun:   { name: "Chain Gun",        desc: "Rapid tri-burst. Stack: +1 bullet/2 stacks, +5% dmg", icon: "🔩", color: "#ff8800", category: 'weapon', maxLevel: 99, rarity: 'rare' },
  weapon_plasma:      { name: "Plasma Cannon",    desc: "Slow heavy plasma ball, 3× dmg, AoE impact. Stack: +15% dmg", icon: "🟣", color: "#aa44ff", category: 'weapon', maxLevel: 99, rarity: 'rare' },
  weapon_flak:        { name: "Flak Cannon",      desc: "8 close-range pellets in wide cone. Stack: +2 pellets/2 stacks, +8% dmg", icon: "💢", color: "#cc6600", category: 'weapon', maxLevel: 99, rarity: 'common' },
  weapon_laser_rifle: { name: "Laser Rifle",      desc: "Ultra-fast piercing beam, 2.5× dmg, slow fire. Stack: +1 pierce, +12% dmg", icon: "🔆", color: "#00ffcc", category: 'weapon', maxLevel: 99, rarity: 'legendary' },

  // ── COMPANION CARDS (drone allies, sustained by oil) ──────────────────────
  companion_scout:  { name: "Scout Drone",   desc: "+1 scout drone (0.3 oil/s). Shoots enemies in 280px", icon: "🤖", color: "#44ccff", category: 'companion', maxLevel: 99, rarity: 'common' },
  companion_combat: { name: "Combat Drone",  desc: "+1 combat drone (0.6 oil/s). Homing shots in 320px", icon: "🤖", color: "#ff6644", category: 'companion', maxLevel: 99, rarity: 'rare' },
  companion_shield: { name: "Shield Drone",  desc: "+1 shield drone (0.8 oil/s). Absorbs 1 hit every 8s", icon: "🤖", color: "#aa44ff", category: 'companion', maxLevel: 99, rarity: 'rare' },
  companion_repair: { name: "Repair Drone",  desc: "+1 repair drone (0.5 oil/s). Restores +1.5 oil/s passively", icon: "🤖", color: "#44ff88", category: 'companion', maxLevel: 99, rarity: 'rare' },
  companion_bomber: { name: "Bomber Drone",  desc: "+1 bomber drone (1.0 oil/s). Drops 40-dmg AoE bombs", icon: "🤖", color: "#ffaa00", category: 'companion', maxLevel: 99, rarity: 'legendary' },

  // ── CHAOS CARDS (drawbacks + powerful upsides) ────────────────────────────
  card_blood_tithe: { name: "Blood Tithe",    desc: "+15% dmg per stack. Drawback: -0.4 oil/s drain each stack", icon: "🩸", color: "#cc0044", category: 'chaos', maxLevel: 99, rarity: 'rare' },
  card_glass_blade: { name: "Glass Blade",    desc: "+20% dmg per stack. Drawback: body contact deals 3× dmg to you", icon: "💎", color: "#00ffcc", category: 'chaos', maxLevel: 99, rarity: 'legendary' },
  card_volatile:    { name: "Volatile Rounds",desc: "10% chance each bullet explodes 25px AoE. Drawback: can damage you", icon: "💣", color: "#ffaa00", category: 'chaos', maxLevel: 99, rarity: 'rare' },
  card_cursed_mag:  { name: "Cursed Magazine",desc: "Every 8th shot deals 5× dmg. Stack: -1 shot cycle (min 4). 7th always 0 dmg", icon: "🔮", color: "#8844ff", category: 'chaos', maxLevel: 5, rarity: 'rare' },
  card_oil_junkie:  { name: "Oil Junkie",     desc: "+1% dmg/10 oil, max +80%. Stack: +10% cap. Drawback: drain faster each stack", icon: "⛽", color: "#dd8800", category: 'chaos', maxLevel: 5, rarity: 'rare' },
  card_death_wish:  { name: "Death Wish",     desc: "Under 20% oil: +60% all stats. Stack: +20% per stack. No rig income active", icon: "💀", color: "#ff2200", category: 'chaos', maxLevel: 3, rarity: 'legendary' },
  card_resonance:   { name: "Resonance Burst",desc: "After 5 kills: next shot 8×. Stack: -1 kill needed (min 2). Resets on hit", icon: "⚡", color: "#44ffcc", category: 'chaos', maxLevel: 5, rarity: 'rare' },
  card_scavenger:   { name: "Scavenger",      desc: "+300% oil from kills. Stack: +100% per stack. Drawback: -40% rig income", icon: "🦅", color: "#88ff44", category: 'chaos', maxLevel: 3, rarity: 'legendary' },

  // ── WILDCARD CARDS (legendary — stackable, each stack amplifies) ─────────
  wild_berserker:  { name: "BERSERKER MODE",   desc: "-25% max oil, +50% fire rate, +40% dmg. Stack: +10% dmg, +8% fire each.", icon: "💢", color: "#ff2200", category: 'wildcard', maxLevel: 3, rarity: 'legendary' },
  wild_glass_cannon:{ name: "GLASS CANNON",   desc: "-40% max oil. Bullets pierce ALL. +60% dmg. Stack: +20% dmg each.", icon: "💎", color: "#00ffcc", category: 'wildcard', maxLevel: 3, rarity: 'legendary' },
  wild_blood_pact: { name: "BLOOD PACT",      desc: "Bullets cost 3× oil, deal +100% dmg. Stack: +50% dmg per stack.", icon: "🩸", color: "#cc0044", category: 'wildcard', maxLevel: 3, rarity: 'legendary' },
  wild_phoenix:    { name: "PHOENIX CORE",    desc: "Once per run: auto-revive at 50% oil on death. Rise from the ashes.", icon: "🔥", color: "#ff8800", category: 'wildcard', maxLevel: 1, rarity: 'legendary' },
  wild_drone_swarm:{ name: "DRONE SWARM",     desc: "+3 mini-drones orbit and auto-fire. Stack: +3 more drones each.", icon: "🤖", color: "#44ccff", category: 'wildcard', maxLevel: 3, rarity: 'legendary' },
  wild_void_rounds:{ name: "VOID ROUNDS",     desc: "Ignore 60% armor, slow targets 25%. Stack: +15% armor pierce per stack.", icon: "🌑", color: "#8844ff", category: 'wildcard', maxLevel: 3, rarity: 'legendary' },
  wild_chaos_engine:{ name: "CHAOS ENGINE",  desc: "Each kill: 20% chance free ability. Stack: +10% chance per stack.", icon: "🎲", color: "#ff44ff", category: 'wildcard', maxLevel: 3, rarity: 'legendary' },
  wild_time_bandit:{ name: "TIME BANDIT",    desc: "25% kill chance: -3s all cooldowns. Stack: +10% chance per stack.", icon: "⏳", color: "#aa88ff", category: 'wildcard', maxLevel: 3, rarity: 'legendary' },
  wild_lucky_break:{ name: "LUCKY BREAK",    desc: "Every 20s a kill gives 5× oil. Stack: -5s interval per stack.", icon: "🍀", color: "#44ff88", category: 'wildcard', maxLevel: 3, rarity: 'legendary' },
  wild_oil_magnate:{ name: "OIL MAGNATE",    desc: "Rig income ×2, enemies target you more. Stack: +0.5× income per stack.", icon: "💰", color: "#ffcc00", category: 'wildcard', maxLevel: 3, rarity: 'legendary' },
  wild_warcry:     { name: "WAR CRY",        desc: "Each kill in 4s: +10% dmg (max +100%). Stack: +5% per kill per stack.", icon: "⚔", color: "#ff6644", category: 'wildcard', maxLevel: 3, rarity: 'legendary' },
  wild_overclock:  { name: "OVERCLOCK BURST",desc: "Every 5th shot free, 6th costs 6× oil. Stack: free shot every 4th each.", icon: "⚙", color: "#44ffcc", category: 'wildcard', maxLevel: 3, rarity: 'legendary' },

  // ── SYNERGY EVOLUTIONS (stackable — each stack enhances the effect) ──────
  pulse_armor:      { name: "PULSE ARMOR",      desc: "Shield pulses 200px EMP on activation. Stack: +50px radius",  icon: "💠", color: "#cc88ff", category: 'special', maxLevel: 3, synergy: true, requires: ['shield', 'emp'] },
  missile_battery:  { name: "MISSILE BATTERY",  desc: "Orbital turrets fire homing missiles. Stack: +20% dmg",        icon: "🛸", color: "#ff8844", category: 'special', maxLevel: 3, synergy: true, requires: ['missile_boost', 'orbital'] },
  inferno_barrage:  { name: "INFERNO BARRAGE",  desc: "Napalm chains to targets. Stack: +20px chain radius",          icon: "🌋", color: "#ff4400", category: 'special', maxLevel: 3, synergy: true, requires: ['spread_shot', 'napalm'] },
  adaptive_plating: { name: "ADAPTIVE PLATING", desc: "Blocked damage restores oil. Stack: +10% more restored",       icon: "💎", color: "#44ffcc", category: 'special', maxLevel: 3, synergy: true, requires: ['armor_plating', 'repair'] },

  // ── EXPANDED SYNERGIES (Phase 1 update) ──────────────────────────────────
  chain_reaction:   { name: "CHAIN REACTION",   desc: "Explosions arc lightning. Stack: +1 chain target",       icon: "⚡", color: "#88ffff", category: 'special', maxLevel: 3, synergy: true, requires: ['explosive_rounds', 'chain_lightning'] },
  blood_money:      { name: "BLOOD MONEY",      desc: "Vampire hits drain nearby rigs. Stack: +20% drain",      icon: "🩸", color: "#cc1144", category: 'special', maxLevel: 3, synergy: true, requires: ['vampire_rounds', 'reckless'] },
  ghost_protocol:   { name: "GHOST PROTOCOL",   desc: "Dash: enemies lose you 1s. Stack: +0.5s lose duration",  icon: "👻", color: "#44ccff", category: 'special', maxLevel: 3, synergy: true, requires: ['reflex_dash', 'shield'] },
  overkill:         { name: "OVERKILL",         desc: "Crits split into 2 piercing bullets. Stack: +1 bullet",  icon: "💀", color: "#ff2244", category: 'special', maxLevel: 3, synergy: true, requires: ['critical', 'piercing'] },
  overload:         { name: "OVERLOAD",         desc: "Black Hole leaves napalm field. Stack: +1 napalm zone",  icon: "🌑", color: "#8844ff", category: 'special', maxLevel: 3, synergy: true, requires: ['black_hole', 'napalm'] },
  iron_storm:       { name: "IRON STORM",       desc: "Fortify turrets fire flak bursts. Stack: +2 pellets",    icon: "⛈",  color: "#aacc88", category: 'special', maxLevel: 3, synergy: true, requires: ['flak_burst', 'fortify'] },
  time_sniper:      { name: "TIME SNIPER",      desc: "Frozen enemies take 3× dmg. Stack: +0.5× multiplier",    icon: "🎯", color: "#aa88ff", category: 'special', maxLevel: 3, synergy: true, requires: ['time_warp', 'high_caliber'] },
  oil_vortex:       { name: "OIL VORTEX",       desc: "Black Hole pulls nearby loot. Stack: +50px pull radius", icon: "🌀", color: "#88ff44", category: 'special', maxLevel: 3, synergy: true, requires: ['black_hole', 'oil_magnet'] },
  shock_nova:       { name: "SHOCK NOVA",       desc: "Oil Nova kills EMP 150px. Stack: +50px EMP range",       icon: "☄",  color: "#44ffcc", category: 'special', maxLevel: 3, synergy: true, requires: ['emp', 'oil_nova'] },
  war_machine:      { name: "WAR MACHINE",      desc: "Burst bullets shred armor -5%. Stack: +1 shred hit",     icon: "⚙",  color: "#ff8844", category: 'special', maxLevel: 3, synergy: true, requires: ['armor_plating', 'burst_shot'] },

  // ── PASSIVE PERKS (formerly milestones — now in the regular level-up pool) ─
  ms_second_wind:     { name: "Second Wind",    desc: "First death: auto-revive at 25 oil. Stack: +15 oil per revival",       icon: "💨", color: "#44ccff", category: 'special', maxLevel: 5, rarity: 'rare' },
  ms_adrenaline:      { name: "Adrenaline",     desc: "Kills under 20% oil: +4 oil each. Stack: +2 oil per kill",             icon: "❤", color: "#ff4488", category: 'special', maxLevel: 5, rarity: 'common' },
  ms_war_economy:     { name: "War Economy",    desc: "Own 3+ rigs: +30% income. Stack: +10% income per stack",               icon: "💰", color: "#ffcc00", category: 'economy', maxLevel: 5, rarity: 'common' },
  ms_veteran:         { name: "Veteran",        desc: "Combo ≥10: +20% bullet dmg. Stack: +10% per stack",                    icon: "🎖", color: "#ff8844", category: 'firepower', maxLevel: 5, rarity: 'common' },
  ms_salvager:        { name: "Salvager",       desc: "Wrecks give 50% more oil. Stack: +25% per stack",                      icon: "⚙", color: "#88aacc", category: 'economy', maxLevel: 5, rarity: 'common' },
  ms_pipeline_expert: { name: "Pipeline Pro",   desc: "Pipelines give 3× income. Stack: +0.5× income per stack",              icon: "🔗", color: "#44ff88", category: 'economy', maxLevel: 5, rarity: 'rare' },
  ms_sharpshooter:    { name: "Sharpshooter",   desc: "Combo ≥5: +2 bullet speed & +15% dmg. Stack: +1 speed, +5% dmg",      icon: "🎯", color: "#8866ff", category: 'firepower', maxLevel: 5, rarity: 'rare' },
  ms_opportunist:     { name: "Opportunist",    desc: "Events give 40% more oil. Stack: +20% per stack",                      icon: "🎁", color: "#ff6644", category: 'economy', maxLevel: 5, rarity: 'common' },
};

/* All synergy keys for easy lookup */
export const SYNERGY_KEYS = Object.keys(UPGRADES).filter(k => UPGRADES[k].synergy);

/* ===== WEAPON MUTATION DEFINITIONS =====
 * Mutations unlock when their base upgrade reaches maxLevel.
 * They dramatically transform how the upgrade works — overpowered feeling.
 * Cost: 150 oil each. ===== */
export const MUTATIONS = {
  minigun_mode:     { name: "MINIGUN MODE",     base: 'rapid_fire',    desc: "Fires 5 ultra-fast tight bullets per shot",                   icon: "🔫", color: "#ff3300" },
  railgun:          { name: "RAILGUN",           base: 'high_caliber',  desc: "Bullets pierce ALL enemies and deal 2× damage",               icon: "⚡", color: "#00ffff" },
  hellfire:         { name: "HELLFIRE",          base: 'burst_shot',    desc: "Each shot fires 8 bullets in a 360° ring of death",           icon: "🌋", color: "#ff6600" },
  obliterate:       { name: "OBLITERATE",        base: 'critical',      desc: "100% crit chance — crits deal 5× damage instead of 2×",      icon: "💀", color: "#ff0044" },
  fortress_plating: { name: "FORTRESS PLATING",  base: 'armor_plating', desc: "-50% damage taken, every hit restores 5 oil",                icon: "🏰", color: "#aaccff" },
  regenerator:      { name: "REGENERATOR",       base: 'repair',        desc: "Triple regen rate — regen works even mid-combat",            icon: "💚", color: "#00ff88" },
};

/* ===== MILESTONE DEFINITIONS ===== */
export const MILESTONE_DEFS = [
  { key: 'second_wind',      name: 'Second Wind',      desc: 'First near-death gives 25 free oil', icon: '💨', color: '#44ccff' },
  { key: 'adrenaline',       name: 'Adrenaline',       desc: 'Kills while <20% oil restore 4 oil each', icon: '⚡', color: '#ff4488' },
  { key: 'war_economy',      name: 'War Economy',      desc: 'Owning 3+ rigs: +30% oil income', icon: '💰', color: '#ffcc00' },
  { key: 'veteran',          name: 'Veteran',          desc: 'Combo ≥10: +20% bullet damage', icon: '🎖', color: '#ff8844' },
  { key: 'salvager',         name: 'Salvager',         desc: 'Wrecks give 50% more oil', icon: '⚙', color: '#88aacc' },
  { key: 'pipeline_expert',  name: 'Pipeline Expert',  desc: 'Pipelines give 3× income instead of 2×', icon: '🔗', color: '#44ff88' },
  { key: 'sharpshooter',     name: 'Sharpshooter',     desc: 'Combo ≥5: +2 bullet speed & +15% dmg', icon: '🎯', color: '#8866ff' },
  { key: 'opportunist',      name: 'Opportunist',      desc: 'Geysers and supply drops give 40% more oil', icon: '🎯', color: '#ff6644' },
];
