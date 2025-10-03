/**
 * World Generation - Pure functions for procedural world creation
 * Extracted from wombatquest.html
 */

// Type definitions removed for JavaScript compatibility
import { 
  CHUNK_SIZE,
  PLAYA_RADIUS,
  DECORATION_SPAWN_RATE,
  COIN_SPAWN_RATE,
  WATER_SPAWN_RATE,
  SNACK_SPAWN_RATE,
  BIKE_SPAWN_RATE,
  GAS_TANK_SPAWN_RATE,
  DANCE_FLOOR_SPAWN_CHANCE,
  ART_INSTALLATION_SPAWN_CHANCE,
  ORGY_DOME_SPAWN_CHANCE,
  FUEL_STATION_SPAWN_CHANCE,
  ART_CAR_SPAWN_CHANCE,
  ART_CAR_OVERLAP_CHECK_ATTEMPTS,
  ART_CAR_MIN_WIDTH,
  ART_CAR_MAX_WIDTH,
  ART_CAR_MIN_HEIGHT,
  ART_CAR_MAX_HEIGHT,
  ART_CAR_MAX_FUEL,
  NPC_MIN_SIZE,
  NPC_MAX_SIZE,
  NPC_BEHAVIOR_TIMER_BASE,
  NPC_DIRECTION_CHANGE_TIMER_BASE,
  CAMP_MIN_X,
  CAMP_MAX_X,
  CAMP_MIN_Y,
  CAMP_MAX_Y
} from '../shared/constants.js';
import { getChunkId, getChunkBounds, isPointInAABB } from '../core/state.js';

/**
 * Generate world content for a specific chunk
 */
export function generateChunkContent(
  chunkX, 
  chunkY, 
  config, 
  rng
) {
  const chunkBounds = getChunkBounds(chunkX, chunkY, config.chunkSize);
  const chunkId = getChunkId(chunkBounds.x, chunkBounds.y, config.chunkSize);
  
  const entities = {
    decorations: [],
    coins: [],
    waterBottles: [],
    snacks: [],
    bikes: [],
    artCars: [],
    moop: [],
    drugs: [],
    danceFloors: [],
    artInstallations: [],
    orgyDomes: [],
    homeCamps: [],
    centerCamps: [],
    fuelStations: [],
    npcs: [],
    gasolineTanks: []
  };

  // Skip generation for center chunk (0,0) - it's handled separately
  if (chunkX === 0 && chunkY === 0) {
    return entities;
  }

  // Generate decorations
  entities.decorations = generateDecorations(chunkBounds, chunkId, config, rng);
  
  // Generate coins
  entities.coins = generateCoins(chunkBounds, chunkId, config, rng);
  
  // Generate water bottles
  entities.waterBottles = generateWaterBottles(chunkBounds, chunkId, config, rng);
  
  // Generate snacks
  entities.snacks = generateSnacks(chunkBounds, chunkId, config, rng);
  
  // Generate bikes
  entities.bikes = generateBikes(chunkBounds, chunkId, config, rng);
  
  // Generate gasoline tanks
  entities.gasolineTanks = generateGasolineTanks(chunkBounds, chunkId, config, rng);
  
  // Generate art cars
  entities.artCars = generateArtCars(chunkBounds, chunkId, config, rng);
  
  // Generate NPCs
  entities.npcs = generateNPCs(chunkBounds, chunkId, config, rng);
  
  // Generate MOOP
  entities.moop = generateMOOP(chunkBounds, chunkId, config, rng);
  
  // Generate drugs
  entities.drugs = generateDrugs(chunkBounds, chunkId, config, rng);
  
  // Generate special locations
  const specialLocations = generateSpecialLocations(chunkBounds, chunkId, config, rng);
  entities.danceFloors = specialLocations.danceFloors;
  entities.artInstallations = specialLocations.artInstallations;
  entities.orgyDomes = specialLocations.orgyDomes;
  entities.fuelStations = specialLocations.fuelStations;

  return entities;
}

/**
 * Generate decorations for a chunk
 */
function generateDecorations(
  chunkBounds, 
  chunkId, 
  config, 
  rng
) {
  const decorations = [];
  const decorationCount = Math.floor(rng() * 3 * DECORATION_SPAWN_RATE);
  
  for (let i = 0; i < decorationCount; i++) {
    const x = chunkBounds.x + rng() * chunkBounds.w;
    const y = chunkBounds.y + rng() * chunkBounds.h;
    const w = 20 + rng() * 40;
    const h = 20 + rng() * 40;
    
    const decorationTypes = ['art', 'temple', 'camp', 'fence', 'tent', 'kitchen', 'shade'];
    const type = decorationTypes[Math.floor(rng() * decorationTypes.length)];
    
    const colors = ['#8B4513', '#654321', '#A0522D', '#D2691E', '#CD853F'];
    const color = colors[Math.floor(rng() * colors.length)];
    
    decorations.push({
      x, y, w, h,
      color,
      type,
      chunkId
    });
  }
  
  return decorations;
}

/**
 * Generate coins for a chunk
 */
function generateCoins(
  chunkBounds, 
  chunkId, 
  config, 
  rng
) {
  const coins = [];
  const coinCount = Math.floor(rng() * 5 * COIN_SPAWN_RATE);
  
  for (let i = 0; i < coinCount; i++) {
    const x = chunkBounds.x + rng() * chunkBounds.w;
    const y = chunkBounds.y + rng() * chunkBounds.h;
    
    coins.push({
      x, y, w: 8, h: 8,
      collected: false,
      chunkId
    });
  }
  
  return coins;
}

/**
 * Generate water bottles for a chunk
 */
function generateWaterBottles(
  chunkBounds, 
  chunkId, 
  config, 
  rng
) {
  const waterBottles = [];
  const waterCount = Math.floor(rng() * 3 * WATER_SPAWN_RATE);
  
  for (let i = 0; i < waterCount; i++) {
    const x = chunkBounds.x + rng() * chunkBounds.w;
    const y = chunkBounds.y + rng() * chunkBounds.h;
    
    waterBottles.push({
      x, y, w: 12, h: 16,
      collected: false,
      chunkId
    });
  }
  
  return waterBottles;
}

/**
 * Generate snacks for a chunk
 */
function generateSnacks(
  chunkBounds, 
  chunkId, 
  config, 
  rng
) {
  const snacks = [];
  const snackCount = Math.floor(rng() * 2 * SNACK_SPAWN_RATE);
  
  const snackTypes = [
    { name: 'Grilled Cheese', hunger: 20, color: '#FFD700', emoji: '🧀' },
    { name: 'Energy Bar', hunger: 15, color: '#8B4513', emoji: '🍫' },
    { name: 'Fruit', hunger: 10, color: '#FF6347', emoji: '🍎' },
    { name: 'Nuts', hunger: 8, color: '#8B4513', emoji: '🥜' }
  ];
  
  for (let i = 0; i < snackCount; i++) {
    const x = chunkBounds.x + rng() * chunkBounds.w;
    const y = chunkBounds.y + rng() * chunkBounds.h;
    const snackType = snackTypes[Math.floor(rng() * snackTypes.length)];
    
    snacks.push({
      x, y, w: 16, h: 16,
      collected: false,
      chunkId,
      name: snackType.name,
      hunger: snackType.hunger,
      color: snackType.color,
      emoji: snackType.emoji
    });
  }
  
  return snacks;
}

/**
 * Generate bikes for a chunk
 */
function generateBikes(
  chunkBounds, 
  chunkId, 
  config, 
  rng
) {
  const bikes = [];
  const bikeCount = Math.floor(rng() * 2 * BIKE_SPAWN_RATE);
  
  const bikeColors = ['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF'];
  
  for (let i = 0; i < bikeCount; i++) {
    const x = chunkBounds.x + rng() * chunkBounds.w;
    const y = chunkBounds.y + rng() * chunkBounds.h;
    const color = bikeColors[Math.floor(rng() * bikeColors.length)];
    
    bikes.push({
      x, y, w: 72, h: 44,
      collected: false,
      chunkId,
      color
    });
  }
  
  return bikes;
}

/**
 * Generate gasoline tanks for a chunk
 */
function generateGasolineTanks(
  chunkBounds, 
  chunkId, 
  config, 
  rng
) {
  const gasolineTanks = [];
  const tankCount = Math.floor(rng() * 1 * GAS_TANK_SPAWN_RATE);
  
  for (let i = 0; i < tankCount; i++) {
    const x = chunkBounds.x + rng() * chunkBounds.w;
    const y = chunkBounds.y + rng() * chunkBounds.h;
    const fuelAmount = 20 + rng() * 30; // 20-50 fuel
    
    gasolineTanks.push({
      x, y, w: 20, h: 24,
      collected: false,
      chunkId,
      fuelAmount
    });
  }
  
  return gasolineTanks;
}

/**
 * Generate art cars for a chunk
 */
function generateArtCars(
  chunkBounds, 
  chunkId, 
  config, 
  rng
) {
  const artCars = [];
  
  if (rng() < ART_CAR_SPAWN_CHANCE) {
    const w = ART_CAR_MIN_WIDTH + rng() * (ART_CAR_MAX_WIDTH - ART_CAR_MIN_WIDTH);
    const h = ART_CAR_MIN_HEIGHT + rng() * (ART_CAR_MAX_HEIGHT - ART_CAR_MIN_HEIGHT);
    
    // Try to place art car without overlapping existing ones
    let placed = false;
    for (let attempt = 0; attempt < ART_CAR_OVERLAP_CHECK_ATTEMPTS && !placed; attempt++) {
      const x = chunkBounds.x + rng() * (chunkBounds.w - w);
      const y = chunkBounds.y + rng() * (chunkBounds.h - h);
      
      // Check if this position overlaps with existing art cars
      const newCar = { x, y, w, h };
      const overlaps = artCars.some(existingCar => 
        checkOverlap(newCar, existingCar)
      );
      
      if (!overlaps) {
        const colors = ['#FF6B35', '#F7931E', '#FFD23F', '#06FFA5', '#3A86FF', '#8338EC'];
        const color = colors[Math.floor(rng() * colors.length)];
        
        const carNames = ['Mutant Vehicle', 'Art Car', 'Mobile Party', 'Desert Cruiser'];
        const name = carNames[Math.floor(rng() * carNames.length)];
        
        const designs = ['Flame', 'Neon', 'Steampunk', 'Psychedelic', 'Minimalist'];
        const design = designs[Math.floor(rng() * designs.length)];
        
        artCars.push({
          x, y, w, h,
          vx: (rng() - 0.5) * 2,
          vy: (rng() - 0.5) * 2,
          color,
          name,
          design,
          weirdMovement: rng() < 0.1, // 10% chance of weird movement
          hasPassenger: false,
          chunkId,
          fuel: ART_CAR_MAX_FUEL,
          maxFuel: ART_CAR_MAX_FUEL,
          flameIntensity: 0
        });
        placed = true;
      }
    }
  }
  
  return artCars;
}

/**
 * Generate NPCs for a chunk
 */
function generateNPCs(
  chunkBounds, 
  chunkId, 
  config, 
  rng
) {
  const npcs = [];
  const npcCount = Math.floor(rng() * 3 * config.populationMultiplier);
  
  const behaviors = ['camp', 'dance', 'bike', 'artcar'];
  const emojis = ['🧑', '👩', '🧑‍🎨', '👨‍🎨', '🧑‍🚀', '👩‍🚀'];
  
  for (let i = 0; i < npcCount; i++) {
    const x = chunkBounds.x + rng() * chunkBounds.w;
    const y = chunkBounds.y + rng() * chunkBounds.h;
    const size = NPC_MIN_SIZE + rng() * (NPC_MAX_SIZE - NPC_MIN_SIZE);
    const behavior = behaviors[Math.floor(rng() * behaviors.length)];
    const emoji = emojis[Math.floor(rng() * emojis.length)];
    
    npcs.push({
      x, y, w: size, h: size,
      vx: (rng() - 0.5) * 2,
      vy: (rng() - 0.5) * 2,
      emoji,
      behavior,
      behaviorTimer: NPC_BEHAVIOR_TIMER_BASE + rng() * 60,
      directionChangeTimer: NPC_DIRECTION_CHANGE_TIMER_BASE + rng() * 60,
      hasGasCan: false,
      gasCanFuel: 0,
      targetArtCar: null,
      karmaReward: 5 + rng() * 10,
      chunkId
    });
  }
  
  return npcs;
}

/**
 * Generate MOOP (Matter Out Of Place) for a chunk
 */
function generateMOOP(
  chunkBounds, 
  chunkId, 
  config, 
  rng
) {
  const moop = [];
  const moopCount = Math.floor(rng() * 4);
  
  const moopTypes = [
    { type: 'Plastic Bottle', emoji: '🍼', karmaValue: 2, inventoryItem: false },
    { type: 'Cigarette Butt', emoji: '🚬', karmaValue: 1, inventoryItem: false },
    { type: 'Food Wrapper', emoji: '🍫', karmaValue: 1, inventoryItem: false },
    { type: 'Metal Scrap', emoji: '🔧', karmaValue: 3, inventoryItem: false },
    { type: 'Wood Chips', emoji: '🪵', karmaValue: 2, inventoryItem: false },
    { type: 'Fabric Scrap', emoji: '🧵', karmaValue: 2, inventoryItem: false },
    { type: 'Glass Shard', emoji: '🔍', karmaValue: 4, inventoryItem: false },
    { type: 'Battery', emoji: '🔋', karmaValue: 5, inventoryItem: false },
    { type: 'Energy Bar', emoji: '🍫', karmaValue: 3, inventoryItem: true, moodBoost: 5, energyBoost: 10 },
    { type: 'Water Bottle', emoji: '💧', karmaValue: 2, inventoryItem: true, moodBoost: 3, energyBoost: 5 }
  ];
  
  for (let i = 0; i < moopCount; i++) {
    const x = chunkBounds.x + rng() * chunkBounds.w;
    const y = chunkBounds.y + rng() * chunkBounds.h;
    const moopType = moopTypes[Math.floor(rng() * moopTypes.length)];
    
    moop.push({
      x, y, w: 12, h: 12,
      collected: false,
      chunkId,
      type: moopType.type,
      emoji: moopType.emoji,
      karmaValue: moopType.karmaValue,
      inventoryItem: moopType.inventoryItem,
      moodBoost: moopType.moodBoost,
      energyBoost: moopType.energyBoost
    });
  }
  
  return moop;
}

/**
 * Generate drugs for a chunk
 */
function generateDrugs(
  chunkBounds, 
  chunkId, 
  config, 
  rng
) {
  const drugs = [];
  const drugCount = Math.floor(rng() * 2);
  
  const drugTypes = [
    { name: 'Molly', emoji: '💊', speedMultiplier: 1.2, duration: 4, hallucinating: false, moodBoost: 20, energyBoost: 15 },
    { name: 'Shrooms', emoji: '🍄', speedMultiplier: 0.8, duration: 6, hallucinating: true },
    { name: 'Acid', emoji: '🌈', speedMultiplier: 0.9, duration: 8, hallucinating: true },
    { name: 'DMT', emoji: '🔮', speedMultiplier: 0.7, duration: 2, hallucinating: true },
    { name: 'Salvia', emoji: '🌿', speedMultiplier: 0.6, duration: 1, hallucinating: true },
    { name: 'Whip-its', emoji: '💨', speedMultiplier: 1.0, duration: 0.1, hallucinating: false, timeMultiplier: 0.01 },
    { name: 'Alcohol', emoji: '🍺', speedMultiplier: 0.7, duration: 3, hallucinating: false, moodBoost: 10 }
  ];
  
  for (let i = 0; i < drugCount; i++) {
    const x = chunkBounds.x + rng() * chunkBounds.w;
    const y = chunkBounds.y + rng() * chunkBounds.h;
    const drugType = drugTypes[Math.floor(rng() * drugTypes.length)];
    
    drugs.push({
      x, y, w: 20, h: 20,
      collected: false,
      chunkId,
      type: drugType.name,
      emoji: drugType.emoji,
      speedMultiplier: drugType.speedMultiplier,
      duration: drugType.duration,
      hallucinating: drugType.hallucinating,
      moodBoost: drugType.moodBoost,
      energyBoost: drugType.energyBoost,
      timeMultiplier: drugType.timeMultiplier
    });
  }
  
  return drugs;
}

/**
 * Generate special locations for a chunk
 */
function generateSpecialLocations(
  chunkBounds, 
  chunkId, 
  config, 
  rng
) {
  const locations = {
    danceFloors: [],
    artInstallations: [],
    orgyDomes: [],
    fuelStations: []
  };
  
  // Dance floors
  if (rng() < DANCE_FLOOR_SPAWN_CHANCE) {
    const x = chunkBounds.x + rng() * chunkBounds.w;
    const y = chunkBounds.y + rng() * chunkBounds.h;
    const w = 100 + rng() * 100;
    const h = 100 + rng() * 100;
    
    locations.danceFloors.push({
      x, y, w, h,
      type: 'danceFloor',
      emoji: '💃',
      name: 'Dance Floor',
      chunkId
    });
  }
  
  // Art installations
  if (rng() < ART_INSTALLATION_SPAWN_CHANCE) {
    const x = chunkBounds.x + rng() * chunkBounds.w;
    const y = chunkBounds.y + rng() * chunkBounds.h;
    const w = 80 + rng() * 120;
    const h = 80 + rng() * 120;
    
    locations.artInstallations.push({
      x, y, w, h,
      type: 'artInstallation',
      emoji: '🎨',
      name: 'Art Installation',
      chunkId
    });
  }
  
  // Orgy domes
  if (rng() < ORGY_DOME_SPAWN_CHANCE) {
    const x = chunkBounds.x + rng() * chunkBounds.w;
    const y = chunkBounds.y + rng() * chunkBounds.h;
    const w = 120 + rng() * 80;
    const h = 120 + rng() * 80;
    
    locations.orgyDomes.push({
      x, y, w, h,
      type: 'orgyDome',
      emoji: '🏕️',
      name: 'Orgy Dome',
      chunkId
    });
  }
  
  // Fuel stations
  if (rng() < FUEL_STATION_SPAWN_CHANCE) {
    const x = chunkBounds.x + rng() * chunkBounds.w;
    const y = chunkBounds.y + rng() * chunkBounds.h;
    const w = 60 + rng() * 40;
    const h = 60 + rng() * 40;
    
    locations.fuelStations.push({
      x, y, w, h,
      type: 'fuelStation',
      emoji: '⛽',
      name: 'Fuel Station',
      chunkId
    });
  }
  
  return locations;
}

/**
 * Generate camp world content
 */
export function generateCampWorld(config, rng) {
  const entities = {
    decorations: [],
    coins: [],
    waterBottles: [],
    snacks: [],
    bikes: [],
    artCars: [],
    moop: [],
    drugs: [],
    danceFloors: [],
    artInstallations: [],
    orgyDomes: [],
    homeCamps: [],
    centerCamps: [],
    fuelStations: [],
    npcs: [],
    gasolineTanks: []
  };

  // Generate camp decorations (fences, tents, etc.)
  for (let i = 0; i < 20; i++) {
    const x = CAMP_MIN_X + rng() * (CAMP_MAX_X - CAMP_MIN_X);
    const y = CAMP_MIN_Y + rng() * (CAMP_MAX_Y - CAMP_MIN_Y);
    const w = 30 + rng() * 50;
    const h = 30 + rng() * 50;
    
    const decorationTypes = ['fence', 'tent', 'kitchen', 'shade'];
    const type = decorationTypes[Math.floor(rng() * decorationTypes.length)];
    
    const colors = ['#8B4513', '#654321', '#A0522D', '#D2691E', '#CD853F'];
    const color = colors[Math.floor(rng() * colors.length)];
    
    entities.decorations.push({
      x, y, w, h,
      color,
      type,
      chunkId: 'camp'
    });
  }

  // Generate camp NPCs (other wombats)
  for (let i = 0; i < 5; i++) {
    const x = CAMP_MIN_X + rng() * (CAMP_MAX_X - CAMP_MIN_X);
    const y = CAMP_MIN_Y + rng() * (CAMP_MAX_Y - CAMP_MIN_Y);
    const size = 20 + rng() * 10;
    
    entities.npcs.push({
      x, y, w: size, h: size,
      vx: (rng() - 0.5) * 1,
      vy: (rng() - 0.5) * 1,
      emoji: '🦫',
      name: 'Wombat',
      color: '#8B4513',
      behavior: 'camp',
      behaviorTimer: 120 + rng() * 60,
      directionChangeTimer: 180 + rng() * 60,
      hasGasCan: false,
      gasCanFuel: 0,
      targetArtCar: null,
      karmaReward: 10,
      chunkId: 'camp',
      isWombat: true
    });
  }

  return entities;
}

/**
 * Generate center camp
 */
export function generateCenterCamp(config, rng) {
  const entities = {
    centerCamps: []
  };

  entities.centerCamps.push({
    x: -100, y: -100, w: 200, h: 200,
    type: 'centerCamp',
    emoji: '🏛️',
    name: 'Center Camp',
    chunkId: 'center-camp'
  });

  return entities;
}

/**
 * Generate player home base
 */
export function generatePlayerHomeBase(config, rng) {
  const entities = {
    homeCamps: []
  };

  entities.homeCamps.push({
    x: -80, y: -80, w: 160, h: 160,
    type: 'homeCamp',
    emoji: '🏠',
    name: 'Your Home Camp',
    chunkId: 'player-home'
  });

  return entities;
}

/**
 * Check if two rectangles overlap
 */
function checkOverlap(a, b) {
  return a.x < b.x + b.w && 
         a.x + a.w > b.x &&
         a.y < b.y + b.h && 
         a.y + a.h > b.y;
}
