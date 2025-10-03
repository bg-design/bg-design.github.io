/**
 * Core State Management - Pure functions for game state
 * Extracted from wombatquest.html
 */

// Type definitions removed for JavaScript compatibility
import { 
  STAT_MAX, 
  CURRENCY_MAX,
  PLAYER_SIZE,
  BASE_PLAYER_SPEED,
  PLAYER_COLOR
} from '../shared/constants.js';

/**
 * Pure utility function to clamp values between min and max
 */
export function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

/**
 * Create a new player with default values
 */
export function createPlayer() {
  return {
    worldX: 0,
    worldY: 0,
    screenX: 0,
    screenY: 0,
    w: PLAYER_SIZE,
    h: PLAYER_SIZE,
    speed: BASE_PLAYER_SPEED,
    color: PLAYER_COLOR,
    stats: createDefaultStats(),
    inventory: createDefaultInventory(),
    flags: { storm: false, goggles: false },
    time: { day: 1, hour: 8, minute: 0 },
    inCamp: false,
    hasSeenCampDialogue: false,
    drugEffects: createDefaultDrugEffects(),
    tripStats: createDefaultTripStats(),
    sleeping: false,
    sleepStartTime: 0,
    cooldowns: createDefaultCooldowns(),
    lastActionTimes: createDefaultLastActionTimes()
  };
}

/**
 * Create default player stats
 */
export function createDefaultStats() {
  return {
    coin: 0,
    karma: 0,
    hunger: 70,
    thirst: 70,
    energy: 70,
    mood: 70
  };
}

/**
 * Create default inventory
 */
export function createDefaultInventory() {
  return {
    'Water': 3,
    'Grilled Cheese': 1,
    'Energy Bar': 1,
    'Gas Can': 0
  };
}

/**
 * Create default drug effects
 */
export function createDefaultDrugEffects() {
  return {
    activeDrugs: [],
    timeMultiplier: 1.0,
    timeStopDuration: 0,
    timeAccumulator: 0,
    whipitsCount: 0
  };
}

/**
 * Create default trip stats
 */
export function createDefaultTripStats() {
  return {
    totalDrugsConsumed: 0,
    drugsTried: new Set(),
    timeHigh: 0,
    totalPlayTime: 0,
    gameStartTime: Date.now(),
    totalDistance: 0,
    lastX: 0,
    lastY: 0,
    walkingTime: 0,
    bikingTime: 0,
    artCarTime: 0,
    meditationCount: 0,
    highMoodTime: 0,
    lowMoodTime: 0,
    wellRestedTime: 0,
    exhaustedTime: 0,
    fastTime: 0,
    slowTime: 0
  };
}

/**
 * Create default cooldowns
 */
export function createDefaultCooldowns() {
  return {
    dance: 0,
    climb: 0,
    orgy: 0,
    chore: 0,
    shop: 0,
    temple: 0,
    man: 0,
    homeSpawn: 0
  };
}

/**
 * Create default last action times
 */
export function createDefaultLastActionTimes() {
  return {
    chore: 0,
    shop: 0,
    temple: 0,
    man: 0,
    climb: 0
  };
}

/**
 * Create default game state
 */
export function createDefaultGameState() {
  return {
    ended: false,
    finalScore: { coins: 0, karma: 0 }
  };
}

/**
 * Apply a stat effect to player stats (pure function)
 */
export function applyStatEffect(stats, effect) {
  return {
    coin: clamp((stats.coin + (effect.coin || 0)), 0, CURRENCY_MAX),
    karma: clamp((stats.karma + (effect.karma || 0)), 0, CURRENCY_MAX),
    hunger: clamp((stats.hunger + (effect.hunger || 0)), 0, STAT_MAX),
    thirst: clamp((stats.thirst + (effect.thirst || 0)), 0, STAT_MAX),
    energy: clamp((stats.energy + (effect.energy || 0)), 0, STAT_MAX),
    mood: clamp((stats.mood + (effect.mood || 0)), 0, STAT_MAX)
  };
}

/**
 * Advance game time by minutes (pure function)
 */
export function advanceTime(time, minutes) {
  let newMinute = time.minute + minutes;
  let newHour = time.hour;
  let newDay = time.day;

  // Handle minute overflow
  while (newMinute >= 60) {
    newMinute -= 60;
    newHour++;
  }

  // Handle hour overflow
  while (newHour >= 24) {
    newHour -= 24;
    newDay++;
  }

  return {
    day: newDay,
    hour: newHour,
    minute: newMinute
  };
}

/**
 * Check if coordinates are within playa boundaries (pure function)
 */
export function isWithinBoundaries(x, y, playaRadius) {
  const distanceFromCenter = Math.sqrt(x * x + y * y);
  return distanceFromCenter <= playaRadius;
}

/**
 * Check if two AABBs (axis-aligned bounding boxes) intersect (pure function)
 */
export function checkCollision(a, b) {
  return a.x < b.x + b.w && 
         a.x + a.w > b.x &&
         a.y < b.y + b.h && 
         a.y + a.h > b.y;
}

/**
 * Calculate distance between two points (pure function)
 */
export function calculateDistance(a, b) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Calculate chunk ID from world coordinates (pure function)
 */
export function getChunkId(x, y, chunkSize) {
  const chunkX = Math.floor(x / chunkSize);
  const chunkY = Math.floor(y / chunkSize);
  return `${chunkX},${chunkY}`;
}

/**
 * Get chunk coordinates from chunk ID (pure function)
 */
export function getChunkCoordinates(chunkId) {
  const [x, y] = chunkId.split(',').map(Number);
  return { x, y };
}

/**
 * Calculate chunk bounds from chunk coordinates (pure function)
 */
export function getChunkBounds(chunkX, chunkY, chunkSize) {
  return {
    x: chunkX * chunkSize,
    y: chunkY * chunkSize,
    w: chunkSize,
    h: chunkSize
  };
}

/**
 * Check if a point is within an AABB (pure function)
 */
export function isPointInAABB(point, aabb) {
  return point.x >= aabb.x && 
         point.x <= aabb.x + aabb.w &&
         point.y >= aabb.y && 
         point.y <= aabb.y + aabb.h;
}

/**
 * Calculate speed multiplier based on stats (pure function)
 */
export function calculateStatSpeedMultiplier(stats) {
  // Energy multiplier (0.3x to 1.2x based on energy level)
  const energyMultiplier = 0.3 + (stats.energy / 100) * 0.9;
  
  // Thirst multiplier (0.4x to 1.1x based on thirst level)
  const thirstMultiplier = 0.4 + (stats.thirst / 100) * 0.7;
  
  // Hunger multiplier (0.5x to 1.1x based on hunger level)
  const hungerMultiplier = 0.5 + (stats.hunger / 100) * 0.6;
  
  // Mood multiplier (0.6x to 1.2x based on mood level)
  const moodMultiplier = 0.6 + (stats.mood / 100) * 0.6;
  
  return energyMultiplier * thirstMultiplier * hungerMultiplier * moodMultiplier;
}

/**
 * Calculate total speed multiplier including bike and drugs (pure function)
 */
export function calculateTotalSpeedMultiplier(
  baseSpeed,
  isRidingBike,
  drugSpeedMultipliers,
  statSpeedMultiplier
) {
  let totalMultiplier = 1;
  
  // Add bike speed multiplier if riding a bike
  if (isRidingBike) {
    totalMultiplier *= 1.5;
  }
  
  // Apply drug speed multipliers
  drugSpeedMultipliers.forEach(multiplier => {
    totalMultiplier *= multiplier;
  });
  
  // Apply stat-based speed multiplier
  totalMultiplier *= statSpeedMultiplier;
  
  return totalMultiplier;
}

/**
 * Calculate time multiplier from active drugs (pure function)
 */
export function calculateTimeMultiplier(drugTimeMultipliers) {
  let timeMultiplier = 1.0;
  
  drugTimeMultipliers.forEach(multiplier => {
    if (multiplier !== undefined && multiplier !== 0) {
      timeMultiplier *= multiplier;
    }
  });
  
  // Ensure timeMultiplier is never 0 (which would freeze time)
  if (timeMultiplier === 0) {
    timeMultiplier = 0.1;
  }
  
  // Cap timeMultiplier to prevent extreme values
  if (timeMultiplier > 10) {
    timeMultiplier = 10;
  }
  if (timeMultiplier < 0.01) {
    timeMultiplier = 0.01;
  }
  
  return timeMultiplier;
}

/**
 * Calculate mood change based on basic needs (pure function)
 */
export function calculateMoodChangeFromNeeds(stats) {
  let moodChange = 0;
  
  // Thirst heavily impacts mood
  if (stats.thirst <= 10) moodChange -= 8; // Very dehydrated = very grumpy
  else if (stats.thirst <= 25) moodChange -= 4; // Dehydrated = grumpy
  else if (stats.thirst <= 40) moodChange -= 2; // Thirsty = slightly grumpy
  
  // Energy heavily impacts mood
  if (stats.energy <= 5) moodChange -= 10; // Exhausted = very grumpy
  else if (stats.energy <= 15) moodChange -= 6; // Very tired = grumpy
  else if (stats.energy <= 30) moodChange -= 3; // Tired = slightly grumpy
  
  // Hunger impacts mood
  if (stats.hunger <= 20) moodChange -= 3; // Hungry = grumpy
  else if (stats.hunger <= 40) moodChange -= 1; // Slightly hungry
  
  return moodChange;
}

/**
 * Calculate gradual mood change for real-time decay (pure function)
 */
export function calculateGradualMoodChange(stats) {
  let gradualMoodChange = -0.5; // Base mood decay
  
  // Thirst impacts mood gradually
  if (stats.thirst <= 10) gradualMoodChange -= 0.3; // Very dehydrated
  else if (stats.thirst <= 25) gradualMoodChange -= 0.2; // Dehydrated
  else if (stats.thirst <= 40) gradualMoodChange -= 0.1; // Thirsty
  
  // Energy impacts mood gradually
  if (stats.energy <= 5) gradualMoodChange -= 0.4; // Exhausted
  else if (stats.energy <= 15) gradualMoodChange -= 0.25; // Very tired
  else if (stats.energy <= 30) gradualMoodChange -= 0.15; // Tired
  
  // Hunger impacts mood gradually
  if (stats.hunger <= 20) gradualMoodChange -= 0.15; // Hungry
  else if (stats.hunger <= 40) gradualMoodChange -= 0.05; // Slightly hungry
  
  return gradualMoodChange;
}

/**
 * Calculate real-time mood change for stat decay intervals (pure function)
 */
export function calculateRealtimeMoodChange(stats) {
  let realtimeMoodChange = -0.5; // Base mood decay
  
  // Thirst heavily impacts mood
  if (stats.thirst <= 10) realtimeMoodChange -= 2; // Very dehydrated
  else if (stats.thirst <= 25) realtimeMoodChange -= 1; // Dehydrated
  else if (stats.thirst <= 40) realtimeMoodChange -= 0.5; // Thirsty
  
  // Energy heavily impacts mood
  if (stats.energy <= 5) realtimeMoodChange -= 3; // Exhausted
  else if (stats.energy <= 15) realtimeMoodChange -= 2; // Very tired
  else if (stats.energy <= 30) realtimeMoodChange -= 1; // Tired
  
  // Hunger impacts mood
  if (stats.hunger <= 20) realtimeMoodChange -= 1; // Hungry
  else if (stats.hunger <= 40) realtimeMoodChange -= 0.3; // Slightly hungry
  
  return realtimeMoodChange;
}

/**
 * Check if player is in camp boundaries (pure function)
 */
export function isPlayerInCamp(player) {
  return player.worldX >= -400 && 
         player.worldX + player.w <= 400 &&
         player.worldY >= -300 && 
         player.worldY + player.h <= 300;
}

/**
 * Check if player is at home camp (pure function)
 */
export function isPlayerAtHomeCamp(player, homeCamps) {
  return homeCamps.some(camp => 
    camp.chunkId === 'player-home' &&
    player.worldX < camp.x + camp.w && 
    player.worldX + player.w > camp.x &&
    player.worldY < camp.y + camp.h && 
    player.worldY + player.h > camp.y
  );
}

/**
 * Calculate energy drain from movement (pure function)
 */
export function calculateEnergyDrain(
  distanceMoved, 
  isRidingBike, 
  isInPlaya
) {
  if (distanceMoved <= 0 || !isInPlaya) return 0;
  
  let energyMultiplier = 0.2; // Base 20% of current drain
  if (isRidingBike) {
    energyMultiplier = 0.02; // Only 2% energy drain when riding bike (10x less)
  }
  
  return (distanceMoved / 10) * energyMultiplier;
}
