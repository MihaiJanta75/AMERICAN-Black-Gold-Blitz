/* ===== GAME CONSTANTS ===== */
export const WORLD_W = 4000;
export const WORLD_H = 4000;
export const TILE = 64;
export const OIL_BASE = 200;          // was 300 — tighter start
export const OIL_BASE_MAX = 1200;
export const WANTED_THRESHOLDS = [0, 300, 600, 1000, 1500];
export const PLAYER_BASE_SPEED = 3.2;
export const FIRE_BASE_COOLDOWN = 0.22;
export const HOMING_COOLDOWN_MS = 600;
export const RIG_COUNT = 6;
export const CAPTURE_RADIUS = 70;
export const CAPTURE_TIME = 2.0;
export const OIL_PER_SECOND = 1.5;    // was 3 — slower passive income, rigs matter more
export const DRONE_DAMAGE = 22;
export const PLANE_DAMAGE = 32;
export const CHOPPER_DAMAGE = 28;
export const BULLET_BASE_SPEED = 7;
export const HOMING_SPEED = 5;
export const HOMING_TURN = 0.06;
export const MAX_DELTA_TIME = 0.05;
export const ENEMY_SPAWN_DISTANCE = 450;
export const UPGRADE_INTERVAL = 600;
// Weapon thresholds removed — weapons are now card-based
export const MAX_LEVEL = 33;
export const STAT_MAX = 7;
export const PICKUP_RADIUS = 50;
export const MAGNET_RADIUS = 180;
export const COMBO_DECAY = 3.0;
export const STREAK_DECAY = 4.0;
export const BOSS_THRESHOLD = 3;
export const RIG_RECAPTURE_INTERVAL = 35;  // enemies recapture slightly slower — rigs more valuable
export const DASH_COOLDOWN = 2.5;
export const DASH_SPEED = 12;
export const DASH_DURATION = 0.15;
export const PLANE_BASE_SPEED = 3.2;      // was 5.2 — planes are slower and more readable
export const JOYSTICK_RADIUS = 60;

/* ===== HIVE MIND ===== */
export const HIVE_ALERT_RADIUS = 350;
export const HIVE_ALERT_DECAY = 0.06;
export const COMMANDER_BUFF_RADIUS = 220;
export const SCOUT_ALERT_DURATION = 10;
export const KAMIKAZE_EXPLOSION_RADIUS = 70;
export const KAMIKAZE_DAMAGE = 45;
export const KAMIKAZE_RUSH_RANGE = 280;

/* ===== OIL ECONOMY ===== */
export const OIL_COST_PER_BULLET = 0.3;
export const OIL_COST_PER_MISSILE = 5;
export const OIL_CRITICAL_THRESHOLD = 0.15;
export const OIL_FLUSH_THRESHOLD = 0.80;
export const OIL_RICH_THRESHOLD = 800;
export const OIL_KILL_DROP = 1;       // kills give minimal oil — rigs are the economy

/* ===== EXISTING MECHANICS ===== */
export const NAPALM_DURATION = 3.5;
export const NAPALM_DPS = 8;
export const NAPALM_RADIUS = 42;
export const CHAIN_RADIUS = 140;
export const KILL_FEED_MAX = 5;
export const FORTIFY_TURRET_COOLDOWN = 2.2;
export const FORTIFY_TURRET_RANGE = 320;
export const OIL_NOVA_RADIUS = 90;
export const OIL_NOVA_DAMAGE = 18;

/* ===== OIL MARKET ===== */
export const OIL_MARKET_INTERVAL = 45;   // seconds between market events
export const OIL_MARKET_DURATION = 15;   // how long a market event lasts

/* ===== DYNAMIC EVENTS ===== */
export const EVENT_INTERVAL = 90;        // seconds between events
export const GEYSER_DURATION = 20;
export const GEYSER_OIL_RATE = 2.0;      // seconds between oil spawns
export const GEYSER_RADIUS = 80;
export const SUPPLY_DROP_DURATION = 18;  // seconds before crate expires
export const SUPPLY_DROP_COLLECT_RADIUS = 55;
export const BLACKOUT_STORM_DURATION = 22;
export const SECTOR_ASSAULT_DURATION = 30;

/* ===== BOMBER ENEMY ===== */
export const BOMBER_HP = 220;
export const BOMBER_SPEED = 1.3;
export const BOMBER_BOMB_RADIUS = 160;
export const BOMBER_BOMB_DAMAGE = 55;

/* ===== SALVAGE ===== */
export const WRECK_LIFE = 10;
export const WRECK_COLLECT_RADIUS = 45;

/* ===== PIPELINE ===== */
export const PIPELINE_COST = 80;
export const PIPELINE_MAX_DIST = 700;
export const PIPELINE_INCOME_MULT = 2;
export const PIPELINE_HP = 120;
export const PIPELINE_BUILD_RADIUS = 90;

/* ===== BLACK HOLE BOMB ===== */
export const BLACK_HOLE_COST = 60;
export const BLACK_HOLE_RADIUS = 300;
export const BLACK_HOLE_DAMAGE = 20;
export const BLACK_HOLE_COOLDOWN = 18;


/* ===== UPGRADE SCREEN ===== */
export const UPGRADE_SCREEN_GRACE_MS = 500;  // ms to ignore taps after upgrade screen opens

/* ===== MILESTONES ===== */
export const MILESTONE_INTERVAL = 500;

/* ===== FACTION RIVALRY ===== */
export const RIVALRY_RANGE = 55;
export const RIVALRY_DAMAGE_RATE = 4;    // dmg/s to each rival
export const RIVALRY_CHECK_INTERVAL = 0.25;

/* ===== PROGRESSIVE RIG SYSTEM ===== */
export const RIG_SPAWN_INTERVAL = 200;   // ~3.3 min between new rig spawns — rigs are valuable milestones
export const RIG_MAX_COUNT = 12;          // max rigs ever on map simultaneously
export const RIG_RESERVE_MIN = 550;       // min oil a rig holds
export const RIG_RESERVE_MAX = 1300;      // max oil a rig holds
export const RIG_CLUSTER_CHANCE = 0.30;   // 30% new rigs spawn near an existing one
export const RIG_CLUSTER_RADIUS_MIN = 320;// cluster spawn min distance from parent
export const RIG_CLUSTER_RADIUS_MAX = 500;// cluster spawn max distance from parent
export const RIG_ISOLATED_MIN = 550;      // isolated spawn min distance from any rig
export const RIG_DEPLETED_FADE = 22;      // seconds a depleted rig lingers (fading)
export const RIG_BURNOUT_FADE  = 50;      // seconds a burnout wreck stays on map
export const RIG_BURNOUT_OIL_MIN = 55;    // salvage oil inside a burnout wreck
export const RIG_BURNOUT_OIL_MAX = 130;

/* ===== AI UPGRADES ===== */
export const AI_UPGRADE_INTERVAL = 120;  // seconds between enemy faction upgrades

/* ===== PLAYER UPGRADE ECONOMY ===== */
export const UPGRADE_OIL_COST_BASE = 50;  // base R&D oil cost for first level of any upgrade
export const OIL_OVERFLOW_DRAIN = 3;      // oil/s drained when tank is full (over-pressure)

/* ===== TERRITORY SYSTEM ===== */
export const TERRITORY_RADIUS = 230;           // aura radius per rig (world px)
export const TERRITORY_CLUSTER_RANGE = 400;    // max distance for two rigs to count as clustered
export const TERRITORY_BONUS_PER_NEIGHBOR = 0.35;  // +35% income per neighboring rig, cap at 3

/* ===== SPECIAL RIGS ===== */
export const GOLD_RIG_INTERVAL = 90;           // seconds between gold rig spawns
export const GOLD_RIG_INCOME_MULT = 3.0;       // 3× income when player-owned
export const CURSED_RIG_CHANCE = 0.15;         // 15% of newly spawned rigs are cursed
export const CURSED_RIG_INCOME_MULT = 3.0;     // 3× income but draws extra waves
