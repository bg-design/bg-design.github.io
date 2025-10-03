/**
 * Core game types and data structures
 */

// MoopType will be defined inline to avoid circular dependency

export interface Vec2 {
  x: number;
  y: number;
}

export interface PlayerStats {
  coins: number;
  energy: number;
  mood: number;
  thirst: number;
  hunger: number;
  karma: number;
  speed: number;
  lightBattery: number; // Light battery level (0-100)
}

export interface Player {
  position: Vec2;
  stats: PlayerStats;
  drugs: PlayerDrugs;
  inventory: PlayerInventory;
  isResting: boolean;
  isOnBike?: boolean;
  mountedBikeId?: string; // ID of the bike the player is mounted on
  mountedOn?: string | null; // ID of the art car the player is mounted on
  lightsOn: boolean; // Whether lights are currently on/off
  // Game statistics for end screen
  totalDrugsTaken: number;
  totalTimeOnDrugs: number; // in seconds
  gameStartTime: number; // timestamp when game started
  achievements: Set<string>; // Track unlocked achievements
  lightEffects: Array<{
    type: 'white' | 'red' | 'green' | 'blue' | 'orange' | 'purple' | 'rainbow';
    startTime: number;
    duration: number; // in seconds
  }>;
}

export interface GameTime {
  day: number;
  hour: number;
  minute: number;
  totalMinutes: number; // Total minutes since game start
}

export type WeatherType = 'clear' | 'nice' | 'overcast' | 'thunderstorm';

export interface Weather {
  type: WeatherType;
  intensity: number; // 0.0 to 1.0
  duration: number; // remaining seconds
  startTime: number; // when it started
}

export interface GameState {
  player: Player;
  seed: number;
  time: GameTime;
  gameEnded: boolean;
  weather: Weather;
  dustStorm: {
    active: boolean;
    intensity: number; // 0.0 to 1.0
    duration: number; // remaining seconds
    startTime: number; // when it started
  };
  coins: Array<{
    id: string;
    position: Vec2;
    value: number;
    collected: boolean;
  }>;
  moop: Array<{
    id: string;
    type: string; // Will be one of the moop types
    position: Vec2;
    radius: number;
    karmaReward: number;
    collected: boolean;
  }>;
  hellStation?: {
    id: string;
    aabb: { x: number; y: number; w: number; h: number };
    spawnIntervalMs: number;
    maxCans: number;
    lastSpawnAt: number;
  };
  gasCans: Array<{
    id: string;
    pos: { x: number; y: number };
    active: boolean;
  }>;
  artCars: Array<{
    id: string;
    pos: { x: number; y: number };
    vel: { x: number; y: number };
    fuel: number;
    fuelMax: number;
    fuelLowThreshold: number;
    state: 'patrol' | 'seekFuel' | 'refueling' | 'idle';
    platformAabb: { x: number; y: number; w: number; h: number };
    holder?: string;
    path?: { x: number; y: number }[];
  }>;
}

export type Direction = 'up' | 'down' | 'left' | 'right';

export interface MovementInput {
  direction: Direction;
  deltaTime: number;
}

export type DrugType = 'caffeine' | 'alcohol' | 'mdma' | 'weed' | 'molly' | 'shrooms' | 'acid' | 'dmt' | 'salvia' | 'whipits' | 'energy-drink' | 'mystery-pill' | 'mystery-snowball' | 'cigarette' | 'joint' | 'vodka' | 'mda' | '2c-i' | 'cocaine' | 'ketamine' | 'cannabis';

export interface DrugEffect {
  type: DrugType;
  duration: number; // in seconds
  intensity: number; // 0.0 to 1.0
  effects: {
    timeScale?: number; // multiplier for time speed
    speed?: number; // speed modifier
    energy?: number; // energy modifier
    mood?: number; // mood modifier
    thirst?: number; // thirst modifier
    hunger?: number; // hunger modifier
    karma?: number; // karma modifier
  };
}

export interface PlayerDrugs {
  active: DrugEffect[];
  maxStack: number;
}

export type ItemType = 'Water' | 'Grilled Cheese' | 'Energy Bar' | 'Trinket' | 'Clothing' | 'Veggie Burger' | 'Fruit Salad' | 'Pizza Slice' | 'Smoothie' | 'Popsicle' | 'Burrito' | 'Taco' | 'Ice Cream' | 'Corn Dog' | 'Funnel Cake' | 'Nachos' | 'Cotton Candy' | 'Gas Can' | 'Light Bulb' | 'Light Bulb White' | 'Light Bulb Red' | 'Light Bulb Green' | 'Light Bulb Blue' | 'Light Bulb Orange' | 'Light Bulb Purple' | 'Light Bulb Rainbow' | 'Battery';

export interface InventoryItem {
  type: ItemType;
  quantity: number;
  hotkey?: string;
  effects: {
    thirst?: number;
    hunger?: number;
    energy?: number;
    mood?: number;
    karma?: number;
    speed?: number;
  };
}

export interface PlayerInventory {
  items: Map<ItemType, number>;
}
