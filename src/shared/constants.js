/**
 * Game Constants - Extracted from wombatquest.html
 * All magic numbers and strings centralized here
 */

// Player Configuration
export const PLAYER_SIZE = 32;
export const BASE_PLAYER_SPEED = 6;
export const PLAYER_COLOR = "#ff6b35";

// World Configuration
export const CHUNK_SIZE = 400;
export const WORLD_SIZE = 6000;
export const PLAYA_RADIUS = 3000;
export const MAN_CIRCLE_RADIUS = 800;
export const TEMPLE_DISTANCE = 750;
export const TRASH_FENCE_RADIUS = 2950;

// Time Configuration
export const SECONDS_PER_DAY = 24;
export const BURNING_MAN_DURATION = 10;
export const MAN_BURN_DAY = 7;
export const TEMPLE_BURN_DAY = 8;

// Stat Limits
export const STAT_MAX = 100;
export const CURRENCY_MAX = 9999;

// Cooldowns (in milliseconds)
export const CHORE_COOLDOWN_MS = 60000;
export const CLIMB_COOLDOWN_MS = 20000;
export const SHOP_COOLDOWN_MS = 60000;
export const DANCE_COOLDOWN_MS = 0; // No cooldown
export const ORGY_COOLDOWN_MS = 0; // No cooldown
export const HOME_SPAWN_COOLDOWN_MS = 15000;

// Stat Decay
export const STAT_DECAY_INTERVAL_MS = 3000;

// UI Configuration
export const PICKUP_COMBINE_TIME_MS = 1000;
export const FEEDBACK_ANIMATION_DURATION_MS = 3000;

// World Population Multipliers
export const INITIAL_POPULATION_MULT = 0.1;
export const PEAK_POPULATION_MULT = 1.0;
export const POST_BURN_POPULATION_MULT = 0.05;

// Time Multiplier Limits
export const MIN_TIME_MULTIPLIER = 0.01;
export const MAX_TIME_MULTIPLIER = 10.0;

// Entity Sizes
export const COIN_SIZE = 8;
export const WATER_BOTTLE_WIDTH = 12;
export const WATER_BOTTLE_HEIGHT = 16;
export const SNACK_SIZE = 16;
export const DRUG_SIZE = 20;
export const BIKE_WIDTH = 72;
export const BIKE_HEIGHT = 44;
export const GASOLINE_TANK_WIDTH = 20;
export const GASOLINE_TANK_HEIGHT = 24;

// Art Car Configuration
export const ART_CAR_MIN_WIDTH = 80;
export const ART_CAR_MAX_WIDTH = 500;
export const ART_CAR_MIN_HEIGHT = 60;
export const ART_CAR_MAX_HEIGHT = 300;
export const ART_CAR_MAX_FUEL = 100;
export const ART_CAR_FUEL_CONSUMPTION_RATE = 0.02;

// NPC Configuration
export const NPC_MIN_SIZE = 16;
export const NPC_MAX_SIZE = 20;
export const NPC_BEHAVIOR_TIMER_BASE = 120;
export const NPC_DIRECTION_CHANGE_TIMER_BASE = 180;

// Camp Configuration
export const CAMP_MIN_X = -400;
export const CAMP_MAX_X = 400;
export const CAMP_MIN_Y = -300;
export const CAMP_MAX_Y = 300;

// Collision Detection
export const COLLISION_DETECTION_DISTANCE = 60;
export const AUTO_BOARD_DISTANCE = 30;
export const LOCATION_INTERACTION_DISTANCE = 80;

// Drug Effects
export const WHIP_ITS_TIME_STOP_DURATION = 5; // seconds
export const MOLLY_HEART_SPAWN_CHANCE = 0.3;
export const MOLLY_MOOD_BOOST_PER_FRAME = 0.5;
export const MOLLY_ENERGY_BOOST_PER_FRAME = 0.3;

// Trip Stats
export const DISTANCE_PIXELS_TO_MILES_RATIO = 100; // 100 pixels = 1 mile

// World Generation
export const GENERATION_RADIUS = 8; // chunks in each direction from center
export const DECORATION_SPAWN_RATE = 0.33; // 1/3 of normal spawn rate
export const COIN_SPAWN_RATE = 0.33; // 1/3 of normal spawn rate
export const WATER_SPAWN_RATE = 0.33; // 1/3 of normal spawn rate
export const SNACK_SPAWN_RATE = 0.33; // 1/3 of normal spawn rate
export const BIKE_SPAWN_RATE = 0.33; // 1/3 of normal spawn rate
export const GAS_TANK_SPAWN_RATE = 0.167; // 1/6 of normal spawn rate (very rare)

// Special Location Spawn Rates
export const DANCE_FLOOR_SPAWN_CHANCE = 0.3;
export const ART_INSTALLATION_SPAWN_CHANCE = 0.3;
export const ORGY_DOME_SPAWN_CHANCE = 0.3;
export const FUEL_STATION_SPAWN_CHANCE = 0.3;

// Art Car Spawn Configuration
export const ART_CAR_SPAWN_CHANCE = 0.4;
export const ART_CAR_OVERLAP_CHECK_ATTEMPTS = 10;

// Disappearing Items (Post-Burn)
export const ITEM_DISAPPEARING_START_DAY = 8;
export const ITEM_DISAPPEARING_END_DAY = 10;
export const ITEM_DISAPPEARING_FEEDBACK_CHANCE = 0.3;
export const COMPLETE_DISAPPEARING_DAY = 11;

// Speed Multipliers
export const BIKE_SPEED_MULTIPLIER = 1.5;
export const ENERGY_SPEED_MULTIPLIER_MIN = 0.3;
export const ENERGY_SPEED_MULTIPLIER_MAX = 1.2;
export const THIRST_SPEED_MULTIPLIER_MIN = 0.4;
export const THIRST_SPEED_MULTIPLIER_MAX = 1.1;
export const HUNGER_SPEED_MULTIPLIER_MIN = 0.5;
export const HUNGER_SPEED_MULTIPLIER_MAX = 1.1;
export const MOOD_SPEED_MULTIPLIER_MIN = 0.6;
export const MOOD_SPEED_MULTIPLIER_MAX = 1.2;

// Energy Drain
export const WALKING_ENERGY_DRAIN_RATE = 0.2;
export const BIKING_ENERGY_DRAIN_RATE = 0.02; // 10x less than walking

// Stat Decay Rates (per stat decay interval)
export const THIRST_DECAY_RATE = 2;
export const HUNGER_DECAY_RATE = 1.5;
export const MOOD_BASE_DECAY_RATE = 0.5;

// Mood Impact Thresholds
export const VERY_DEHYDRATED_THRESHOLD = 10;
export const DEHYDRATED_THRESHOLD = 25;
export const THIRSTY_THRESHOLD = 40;
export const EXHAUSTED_THRESHOLD = 5;
export const VERY_TIRED_THRESHOLD = 15;
export const TIRED_THRESHOLD = 30;
export const HUNGRY_THRESHOLD = 20;
export const SLIGHTLY_HUNGRY_THRESHOLD = 40;
export const LOW_ENERGY_THRESHOLD = 20;

// Mood Change Rates
export const VERY_DEHYDRATED_MOOD_CHANGE = -8;
export const DEHYDRATED_MOOD_CHANGE = -4;
export const THIRSTY_MOOD_CHANGE = -2;
export const EXHAUSTED_MOOD_CHANGE = -10;
export const VERY_TIRED_MOOD_CHANGE = -6;
export const TIRED_MOOD_CHANGE = -3;
export const HUNGRY_MOOD_CHANGE = -3;
export const SLIGHTLY_HUNGRY_MOOD_CHANGE = -1;
export const SLEEPING_MOOD_CHANGE = 2;
export const NEED_SLEEP_MOOD_CHANGE = -2;

// Gradual Mood Decay Rates (per frame)
export const VERY_DEHYDRATED_GRADUAL_MOOD_CHANGE = -0.3;
export const DEHYDRATED_GRADUAL_MOOD_CHANGE = -0.2;
export const THIRSTY_GRADUAL_MOOD_CHANGE = -0.1;
export const EXHAUSTED_GRADUAL_MOOD_CHANGE = -0.4;
export const VERY_TIRED_GRADUAL_MOOD_CHANGE = -0.25;
export const TIRED_GRADUAL_MOOD_CHANGE = -0.15;
export const HUNGRY_GRADUAL_MOOD_CHANGE = -0.15;
export const SLIGHTLY_HUNGRY_GRADUAL_MOOD_CHANGE = -0.05;
export const NEED_SLEEP_GRADUAL_MOOD_CHANGE = -0.1;

// Realtime Mood Decay Rates (per stat decay interval)
export const VERY_DEHYDRATED_REALTIME_MOOD_CHANGE = -2;
export const DEHYDRATED_REALTIME_MOOD_CHANGE = -1;
export const THIRSTY_REALTIME_MOOD_CHANGE = -0.5;
export const EXHAUSTED_REALTIME_MOOD_CHANGE = -3;
export const VERY_TIRED_REALTIME_MOOD_CHANGE = -2;
export const TIRED_REALTIME_MOOD_CHANGE = -1;
export const HUNGRY_REALTIME_MOOD_CHANGE = -1;
export const SLIGHTLY_HUNGRY_REALTIME_MOOD_CHANGE = -0.3;
export const NEED_SLEEP_REALTIME_MOOD_CHANGE = -0.5;

// Karma Decay
export const KARMA_DECAY_RATE = 0.1; // per stat decay interval
export const KARMA_DECAY_THRESHOLD = 10; // when thirst/hunger < this

// Visual Effects
export const CONFETTI_PARTICLE_COUNT = 50;
export const CONFETTI_PARTICLE_LIFE_BASE = 120;
export const CONFETTI_PARTICLE_LIFE_RANDOM = 60;
export const CONFETTI_GRAVITY = 0.3;
export const CONFETTI_AIR_RESISTANCE = 0.99;
export const MOLLY_HEART_LIFE_BASE = 60;
export const MOLLY_HEART_LIFE_RANDOM = 40;
export const MOLLY_HEART_SIZE_BASE = 10;
export const MOLLY_HEART_SIZE_RANDOM = 15;
export const MOLLY_HEART_OPACITY_BASE = 0.6;
export const MOLLY_HEART_OPACITY_RANDOM = 0.4;

// Time System
export const TIME_UPDATE_INTERVAL_MS = 1000;
export const TIME_ACCUMULATOR_BASE = 1/60; // 1 minute = 1/60 hour
export const MAX_MINUTES_PER_UPDATE = 1440; // Prevent advancing more than 24 hours
export const TIME_SYSTEM_STUCK_THRESHOLD_MS = 10000;
export const TIME_STOP_SAFETY_THRESHOLD = 10;

// Camp Exit Cooldown
export const CAMP_EXIT_COOLDOWN_MS = 5000;

// Speed State Tracking Thresholds
export const FAST_SPEED_THRESHOLD = 1.2;
export const SLOW_SPEED_THRESHOLD = 0.8;

// Movement State Thresholds
export const WALKING_PERCENTAGE_THRESHOLD = 70;
export const BIKING_PERCENTAGE_THRESHOLD = 50;
export const ART_CAR_PERCENTAGE_THRESHOLD = 30;

// Mood State Thresholds
export const HIGH_MOOD_THRESHOLD = 80;
export const LOW_MOOD_THRESHOLD = 20;
export const WELL_RESTED_THRESHOLD = 80;

// Achievement Thresholds
export const RAINBOW_WARRIOR_DRUGS = 6;
export const DIAMOND_HANDS_COINS = 1000;
export const HEART_OF_GOLD_KARMA = 500;
export const DUST_STORM_SURVIVOR_DAYS = 10;
export const PARTY_LEGEND_HIGH_TIME_PERCENTAGE = 90;
export const MARATHONER_DISTANCE_MILES = 100;
export const MEDITATOR_COUNT = 5;
export const SUNSHINE_SOUL_MOOD_PERCENTAGE = 50;
export const MOODY_BLUES_MOOD_PERCENTAGE = 30;
export const WELL_RESTED_PERCENTAGE = 60;
export const EXHAUSTED_EXPLORER_PERCENTAGE = 40;
export const SPEED_DEMON_PERCENTAGE = 40;
export const SLOW_STEADY_PERCENTAGE = 50;

// Distance Thresholds
export const PLAYA_MARATHONER_DISTANCE = 100;
export const WANDERING_SOUL_DISTANCE = 50;
export const HOMEBODY_DISTANCE = 10;

// Drug Experience Thresholds
export const PSYCHONAUT_EXPLORER_DRUGS = 8;
export const PARTY_ANIMAL_HIGH_TIME_PERCENTAGE = 50;
export const SOBER_SCOUT_HIGH_TIME_PERCENTAGE = 10;
