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

/* ===== FACTION COLORS ===== */
export const FACTIONS = {
  red:    { name: "Crimson", body: "#cc2222", accent: "#ff4444", dark: "#991111", glow: "#ff6644", style: "aggressive" },
  blue:   { name: "Cobalt",  body: "#2244cc", accent: "#4488ff", dark: "#112299", glow: "#4466ff", style: "tactical" },
  yellow: { name: "Amber",   body: "#cc8800", accent: "#ffcc00", dark: "#996600", glow: "#ffaa22", style: "fast" },
  purple: { name: "Violet",  body: "#7722aa", accent: "#aa44ff", dark: "#551188", glow: "#cc66ff", style: "tanky" },
};
export const FACTION_KEYS = Object.keys(FACTIONS);

/* ===== LOOT TYPES ===== */
export const LOOT_TYPES = {
  xp_small:   { color: "#44ffcc", glow: "#22ddaa", radius: 5,  value: 10, type: "xp" },
  xp_medium:  { color: "#44ff88", glow: "#22dd66", radius: 7,  value: 25, type: "xp" },
  xp_large:   { color: "#88ff44", glow: "#66dd22", radius: 9,  value: 60, type: "xp" },
  oil_small:  { color: "#222", glow: "#555", radius: 6,  value: 20, type: "oil" },
  oil_large:  { color: "#111", glow: "#444", radius: 9,  value: 50, type: "oil" },
  pow_speed:  { color: "#44ccff", glow: "#22aaff", radius: 10, duration: 8, type: "powerup", effect: "speed", label: "SPEED!" },
  pow_damage: { color: "#ff4444", glow: "#ff2222", radius: 10, duration: 8, type: "powerup", effect: "damage", label: "DAMAGE!" },
  pow_shield: { color: "#aa44ff", glow: "#8822dd", radius: 10, duration: 10, type: "powerup", effect: "shield", label: "SHIELD!" },
  pow_magnet: { color: "#ffcc00", glow: "#ddaa00", radius: 10, duration: 12, type: "powerup", effect: "magnet", label: "MAGNET!" },
};

/* ===== UPGRADE DEFINITIONS ===== */
export const UPGRADES = {
  spread_shot:    { name: "Spread Shot",      desc: "Spread pattern",      icon: "🌟", color: "#ffcc00", maxLevel: 2 },
  oil_magnet:     { name: "Oil Magnet",        desc: "+50% oil gain",       icon: "🧲", color: "#88ff44", maxLevel: 3 },
  shield:         { name: "Energy Shield",     desc: "Auto-shield 15s",     icon: "🔮", color: "#aa44ff", maxLevel: 2 },
  emp:            { name: "EMP Blast",         desc: "Stun on damage",      icon: "💫", color: "#44ffff", maxLevel: 2 },
  critical:       { name: "Critical Strike",   desc: "+15% crit (2x)",      icon: "💥", color: "#ff4444", maxLevel: 3 },
  repair:         { name: "Nano Repair",       desc: "+3 oil/sec regen",    icon: "💚", color: "#44ff88", maxLevel: 3 },
  missile_boost:  { name: "Warhead Upgrade",   desc: "+40% missile dmg",    icon: "🚀", color: "#ff6600", maxLevel: 2 },
  piercing:       { name: "Piercing Rounds",   desc: "Bullets pierce +1",   icon: "⟐",  color: "#ffaa44", maxLevel: 2 },
  orbital:        { name: "Orbital Strike",    desc: "Auto-turret orbits",  icon: "⊕",  color: "#66ccff", maxLevel: 2 },
  xp_boost:       { name: "Knowledge",         desc: "+30% XP gain",        icon: "📖", color: "#ddddff", maxLevel: 3 },
};
