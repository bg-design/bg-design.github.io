import { Vec2 } from '../core';

/**
 * Types of moop (trash) that can be found in the world
 */
export type MoopType = 
  | 'ziptie'
  | 'water-bottle'
  | 'cup'
  | 'flashing-light'
  | 'furry-hat'
  | 'cigarette-butt'
  | 'light-bulb';

/**
 * Moop item definition
 */
export interface MoopItem {
  id: string;
  type: MoopType;
  position: Vec2;
  radius: number;
  karmaReward: number;
  collected: boolean;
}

/**
 * Moop configuration for each type
 */
export interface MoopConfig {
  emoji: string;
  radius: number;
  karmaReward: number;
  spawnWeight: number; // Higher = more likely to spawn
}

/**
 * Collection of all moop configurations
 */
export const MOOP_DEFINITIONS: Record<MoopType, MoopConfig> = {
  'ziptie': {
    emoji: '🔗',
    radius: 8,
    karmaReward: 2,
    spawnWeight: 15,
  },
  'water-bottle': {
    emoji: '🍼',
    radius: 12,
    karmaReward: 3,
    spawnWeight: 20,
  },
  'cup': {
    emoji: '🥤',
    radius: 10,
    karmaReward: 2,
    spawnWeight: 18,
  },
  'flashing-light': {
    emoji: '💡',
    radius: 14,
    karmaReward: 5,
    spawnWeight: 8,
  },
  'furry-hat': {
    emoji: '🎩',
    radius: 16,
    karmaReward: 8,
    spawnWeight: 5,
  },
  'cigarette-butt': {
    emoji: '🚬',
    radius: 6,
    karmaReward: 1,
    spawnWeight: 25,
  },
  'light-bulb': {
    emoji: '💡',
    radius: 8,
    karmaReward: -5, // Negative karma for creating moop
    spawnWeight: 0, // Only spawned when dropped, not naturally
  },
};

/**
 * Generate a unique ID for a moop item
 */
export function generateMoopId(): string {
  return `moop_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Get display name for moop type
 */
export function getMoopDisplayName(type: MoopType): string {
  const displayNames: Record<MoopType, string> = {
    'ziptie': 'Zip Tie',
    'water-bottle': 'Water Bottle',
    'cup': 'Cup',
    'flashing-light': 'Flashing Light',
    'furry-hat': 'Furry Hat',
    'cigarette-butt': 'Cigarette Butt',
    'light-bulb': 'Light Bulb',
  };
  return displayNames[type];
}
