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
  firepower: { label: 'FIREPOWER',  color: '#ff4444' },
  defense:   { label: 'DEFENSE',    color: '#6699ff' },
  economy:   { label: 'ECONOMY',    color: '#44ff88' },
  mobility:  { label: 'MOBILITY',   color: '#ffcc44' },
  special:   { label: 'SPECIAL',    color: '#aa44ff' },
  stat:      { label: 'STAT UP',    color: '#aaccff' },
  wildcard:  { label: 'WILDCARD',   color: '#ff44ff' },
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
  // ── FIREPOWER ──────────────────────────────────────────────────────────────
  rapid_fire:      { name: "Rapid Fire",      desc: "+20% fire rate per level",         icon: "🔫", color: "#ff6644", category: 'firepower', maxLevel: 3, rarity: 'common' },
  high_caliber:    { name: "High-Caliber",    desc: "+25% bullet damage per level",     icon: "🎯", color: "#ff2244", category: 'firepower', maxLevel: 3, rarity: 'common' },
  burst_shot:      { name: "Burst Shot",      desc: "+1 extra bullet fired per level",  icon: "✴", color: "#ffaa44", category: 'firepower', maxLevel: 3, rarity: 'common' },
  spread_shot:     { name: "Spread Shot",     desc: "Fan burst: +2 bullets per level",  icon: "🌟", color: "#ffcc00", category: 'firepower', maxLevel: 2, rarity: 'common' },
  critical:        { name: "Critical Strike", desc: "+15% crit chance per level",       icon: "💥", color: "#ff4444", category: 'firepower', maxLevel: 3, rarity: 'common' },
  piercing:        { name: "Piercing Rounds", desc: "Bullets pierce +1 target",         icon: "⟐",  color: "#ff8844", category: 'firepower', maxLevel: 2, rarity: 'common' },
  chain_lightning: { name: "Chain Lightning", desc: "Bullets arc to nearby foes",       icon: "⚡", color: "#88ffff", category: 'firepower', maxLevel: 2, rarity: 'rare' },
  napalm:          { name: "Napalm Rounds",   desc: "Bullets leave burning fire zones", icon: "🔥", color: "#ff6622", category: 'firepower', maxLevel: 2, rarity: 'rare' },
  warhead:         { name: "Warhead",         desc: "Missiles become massive AoE bombs (3× dmg, 90px blast)", icon: "💣", color: "#ff4400", category: 'firepower', maxLevel: 1, rarity: 'rare', rare: true },
  explosive_rounds:{ name: "Explosive Rounds",desc: "Bullets detonate on hit (30px AoE, 40% dmg)", icon: "💥", color: "#ff6600", category: 'firepower', maxLevel: 2, rarity: 'common' },
  vampire_rounds:  { name: "Vampire Rounds",  desc: "+0.4 oil restored per bullet hit per level", icon: "🩸", color: "#cc1144", category: 'firepower', maxLevel: 3, rarity: 'common' },
  flak_burst:      { name: "Flak Burst",      desc: "Each shot fires 5 extra close-range pellets", icon: "🌪", color: "#ffaa66", category: 'firepower', maxLevel: 2, rarity: 'rare' },

  // ── DEFENSE ───────────────────────────────────────────────────────────────
  shield:          { name: "Energy Shield",   desc: "Auto-shield, 15s→7s cooldown",    icon: "🔮", color: "#aa44ff", category: 'defense',   maxLevel: 2, rarity: 'rare' },
  emp:             { name: "EMP Blast",       desc: "Stun burst when you get hit",      icon: "💫", color: "#44ffff", category: 'defense',   maxLevel: 2, rarity: 'common' },
  armor_plating:   { name: "Armor Plating",   desc: "-15% damage taken per level",      icon: "🛡", color: "#88aacc", category: 'defense',   maxLevel: 3, rarity: 'common' },
  counter_attack:  { name: "Counter-Attack",  desc: "After hit: +30% dmg for 3s",       icon: "⚔",  color: "#ff4488", category: 'defense',   maxLevel: 2, rarity: 'common' },
  repair:          { name: "Nano Repair",     desc: "+3 oil/sec passive regen",         icon: "💚", color: "#44ff88", category: 'defense',   maxLevel: 3, rarity: 'common' },
  iron_will:       { name: "Iron Will",       desc: "+0.35s invincibility after hit/level", icon: "🪖", color: "#8899cc", category: 'defense', maxLevel: 3, rarity: 'common' },

  // ── MOBILITY ──────────────────────────────────────────────────────────────
  speed_boost:     { name: "Speed Boost",     desc: "+18% move speed per level",        icon: "💨", color: "#ffee44", category: 'mobility',  maxLevel: 3, rarity: 'common' },
  reflex_dash:     { name: "Reflex Dash",     desc: "-0.6s dash cooldown per level",    icon: "🔄", color: "#44ccff", category: 'mobility',  maxLevel: 2, rarity: 'common' },
  time_warp:       { name: "Time Warp",       desc: "Q key: stuns all on-screen enemies for 4s", icon: "⏱", color: "#aa88ff", category: 'mobility',  maxLevel: 1, rarity: 'rare', rare: true },

  // ── ECONOMY ───────────────────────────────────────────────────────────────
  oil_magnet:      { name: "Oil Magnet",      desc: "+50% oil income per level",        icon: "🧲", color: "#88ff44", category: 'economy',   maxLevel: 3, rarity: 'common' },
  overcharge:      { name: "Overcharge",      desc: ">80% oil: +15% faster fire rate",  icon: "🔋", color: "#ffdd44", category: 'economy',   maxLevel: 2, rarity: 'common' },
  reckless:        { name: "Reckless",        desc: "<30% oil: +30% bullet damage",     icon: "☠",  color: "#ff2244", category: 'economy',   maxLevel: 2, rarity: 'common' },
  fortify:         { name: "Fortify Rigs",    desc: "Owned rigs fire defensive turrets",icon: "🏭", color: "#aacc88", category: 'economy',   maxLevel: 2, rarity: 'rare' },
  xp_boost:        { name: "Knowledge",       desc: "+30% XP gain per level",           icon: "📖", color: "#ddddff", category: 'economy',   maxLevel: 3, rarity: 'common' },
  supply_network:  { name: "Supply Network",  desc: "+1 oil/s bonus per owned rig",     icon: "🔗", color: "#44ddaa", category: 'economy',   maxLevel: 2, rarity: 'common' },

  // ── SPECIAL (rare) ────────────────────────────────────────────────────────
  orbital:         { name: "Orbital Strike",  desc: "Auto-turret orbits player",        icon: "⊕",  color: "#66ccff", category: 'special',   maxLevel: 2, rarity: 'rare' },
  oil_nova:        { name: "Oil Nova",        desc: "Kills spray burning oil on foes",  icon: "💦", color: "#dd8800", category: 'special',   maxLevel: 2, rarity: 'rare' },
  missile_boost:   { name: "Missile Boost",   desc: "+40% missile dmg & speed",         icon: "🚀", color: "#ff6600", category: 'special',   maxLevel: 2, rarity: 'common' },
  black_hole:      { name: "Black Hole Bomb", desc: "B key: costs 60 oil, pulls+damages all in 300px", icon: "🕳", color: "#8844ff", category: 'special', maxLevel: 1, rarity: 'rare', rare: true },

  // ── STAT CARDS (replace 1-8 key system) ─────────────────────────────────
  stat_speed:      { name: "Quick Reflexes",     desc: "+12% move speed per level",         icon: "⚡", color: "#ffee88", category: 'stat', maxLevel: 3, rarity: 'common' },
  stat_armor:      { name: "Titanium Hull",       desc: "-12% damage taken per level",       icon: "🛡", color: "#aaccff", category: 'stat', maxLevel: 3, rarity: 'common' },
  stat_health:     { name: "Reinforced Tank",     desc: "+150 max oil per level",            icon: "🛢", color: "#44ff88", category: 'stat', maxLevel: 3, rarity: 'common' },
  stat_regen:      { name: "Oil Seal",            desc: "+2 oil/s passive regen per level",  icon: "💧", color: "#44ddaa", category: 'stat', maxLevel: 3, rarity: 'common' },
  stat_reload:     { name: "Rapid Cycling",       desc: "-12% reload time per level",        icon: "⟳",  color: "#ffaa44", category: 'stat', maxLevel: 3, rarity: 'common' },
  stat_bullet_spd: { name: "Velocity Rounds",     desc: "+20% bullet speed per level",       icon: "»",  color: "#44ccff", category: 'stat', maxLevel: 3, rarity: 'common' },
  stat_bullet_dmg: { name: "Dense Slugs",         desc: "+20% bullet damage per level",      icon: "✦",  color: "#ff8844", category: 'stat', maxLevel: 3, rarity: 'common' },
  stat_pierce:     { name: "Penetration Rifling", desc: "Bullets pierce +1 more target",     icon: "◆",  color: "#cc88ff", category: 'stat', maxLevel: 2, rarity: 'rare' },

  // ── WILDCARD CARDS (legendary — game-changers) ────────────────────────────
  wild_berserker:  { name: "BERSERKER MODE",   desc: "-25% max oil. +50% fire rate. +40% bullet damage. High risk, higher reward.", icon: "💢", color: "#ff2200", category: 'wildcard', maxLevel: 1, rarity: 'legendary' },
  wild_glass_cannon:{ name: "GLASS CANNON",   desc: "-40% max oil. Bullets pierce ALL enemies. +60% damage. Zero survivors.", icon: "💎", color: "#00ffcc", category: 'wildcard', maxLevel: 1, rarity: 'legendary' },
  wild_blood_pact: { name: "BLOOD PACT",      desc: "Bullets cost 3× oil. But deal +100% damage. Spend blood, reap carnage.", icon: "🩸", color: "#cc0044", category: 'wildcard', maxLevel: 1, rarity: 'legendary' },
  wild_phoenix:    { name: "PHOENIX CORE",    desc: "Once per run: auto-revive at 50% oil on death. Rise from the ashes.", icon: "🔥", color: "#ff8800", category: 'wildcard', maxLevel: 1, rarity: 'legendary' },
  wild_drone_swarm:{ name: "DRONE SWARM",     desc: "+3 mini-drones orbit you and auto-fire at nearby enemies.", icon: "🤖", color: "#44ccff", category: 'wildcard', maxLevel: 1, rarity: 'legendary' },
  wild_void_rounds:{ name: "VOID ROUNDS",     desc: "Bullets ignore 60% enemy armor. Hits slow targets by 25%.", icon: "🌑", color: "#8844ff", category: 'wildcard', maxLevel: 1, rarity: 'legendary' },
  wild_chaos_engine:{ name: "CHAOS ENGINE",  desc: "Each kill: 20% chance to trigger Time Warp or Black Hole for free.", icon: "🎲", color: "#ff44ff", category: 'wildcard', maxLevel: 1, rarity: 'legendary' },
  wild_time_bandit:{ name: "TIME BANDIT",    desc: "Kills have 25% chance to instantly reduce all cooldowns by 3s.", icon: "⏳", color: "#aa88ff", category: 'wildcard', maxLevel: 1, rarity: 'legendary' },
  wild_lucky_break:{ name: "LUCKY BREAK",    desc: "Once per 20s: a kill awards 5× oil reward. Fortune favours bold.", icon: "🍀", color: "#44ff88", category: 'wildcard', maxLevel: 1, rarity: 'legendary' },
  wild_oil_magnate:{ name: "OIL MAGNATE",    desc: "All rig income ×2. Enemies target you 60% more aggressively.", icon: "💰", color: "#ffcc00", category: 'wildcard', maxLevel: 1, rarity: 'legendary' },
  wild_warcry:     { name: "WAR CRY",        desc: "Each kill in 4s adds +10% damage (stacks, max +100%). Keep killing.", icon: "⚔", color: "#ff6644", category: 'wildcard', maxLevel: 1, rarity: 'legendary' },
  wild_overclock:  { name: "OVERCLOCK BURST",desc: "Every 5th shot is completely free. Every 6th costs 6× oil. Rhythm or ruin.", icon: "⚙", color: "#44ffcc", category: 'wildcard', maxLevel: 1, rarity: 'legendary' },

  // ── SYNERGY EVOLUTIONS ────────────────────────────────────────────────────
  pulse_armor:      { name: "PULSE ARMOR",      desc: "Shield pulses a 200px EMP on activation",  icon: "💠", color: "#cc88ff", category: 'special', maxLevel: 1, synergy: true, requires: ['shield', 'emp'] },
  missile_battery:  { name: "MISSILE BATTERY",  desc: "Orbital turrets fire homing missiles",      icon: "🛸", color: "#ff8844", category: 'special', maxLevel: 1, synergy: true, requires: ['missile_boost', 'orbital'] },
  inferno_barrage:  { name: "INFERNO BARRAGE",  desc: "Napalm fire chains from target to target",  icon: "🌋", color: "#ff4400", category: 'special', maxLevel: 1, synergy: true, requires: ['spread_shot', 'napalm'] },
  adaptive_plating: { name: "ADAPTIVE PLATING", desc: "Blocked damage restores oil",               icon: "💎", color: "#44ffcc", category: 'special', maxLevel: 1, synergy: true, requires: ['armor_plating', 'repair'] },

  // ── EXPANDED SYNERGIES (Phase 1 update) ──────────────────────────────────
  chain_reaction:   { name: "CHAIN REACTION",   desc: "Explosions arc lightning to nearby enemies",       icon: "⚡", color: "#88ffff", category: 'special', maxLevel: 1, synergy: true, requires: ['explosive_rounds', 'chain_lightning'] },
  blood_money:      { name: "BLOOD MONEY",      desc: "Vampire hits also drain oil from nearby enemy rigs",icon: "🩸", color: "#cc1144", category: 'special', maxLevel: 1, synergy: true, requires: ['vampire_rounds', 'reckless'] },
  ghost_protocol:   { name: "GHOST PROTOCOL",   desc: "Dashing makes enemies lose you for 1s",            icon: "👻", color: "#44ccff", category: 'special', maxLevel: 1, synergy: true, requires: ['reflex_dash', 'shield'] },
  overkill:         { name: "OVERKILL",         desc: "Crits split into 2 piercing bullets on impact",    icon: "💀", color: "#ff2244", category: 'special', maxLevel: 1, synergy: true, requires: ['critical', 'piercing'] },
  overload:         { name: "OVERLOAD",         desc: "Black Hole leaves a napalm field at detonation",   icon: "🌑", color: "#8844ff", category: 'special', maxLevel: 1, synergy: true, requires: ['black_hole', 'napalm'] },
  iron_storm:       { name: "IRON STORM",       desc: "Fortify turrets fire flak pellet bursts",          icon: "⛈",  color: "#aacc88", category: 'special', maxLevel: 1, synergy: true, requires: ['flak_burst', 'fortify'] },
  time_sniper:      { name: "TIME SNIPER",      desc: "Frozen enemies take 3× bullet damage",             icon: "🎯", color: "#aa88ff", category: 'special', maxLevel: 1, synergy: true, requires: ['time_warp', 'high_caliber'] },
  oil_vortex:       { name: "OIL VORTEX",       desc: "Black Hole pulls all nearby loot to you",          icon: "🌀", color: "#88ff44", category: 'special', maxLevel: 1, synergy: true, requires: ['black_hole', 'oil_magnet'] },
  shock_nova:       { name: "SHOCK NOVA",       desc: "Oil Nova kills also EMP all enemies 150px",        icon: "☄",  color: "#44ffcc", category: 'special', maxLevel: 1, synergy: true, requires: ['emp', 'oil_nova'] },
  war_machine:      { name: "WAR MACHINE",      desc: "Burst bullets shred enemy armor (stacking -5% each)",icon:"⚙", color: "#ff8844", category: 'special', maxLevel: 1, synergy: true, requires: ['armor_plating', 'burst_shot'] },
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
  { key: 'night_fighter',    name: 'Night Fighter',    desc: 'Night mode: +2 bullet speed & +15% dmg', icon: '🌙', color: '#8866ff' },
  { key: 'opportunist',      name: 'Opportunist',      desc: 'Geysers and supply drops give 40% more oil', icon: '🎯', color: '#ff6644' },
];
