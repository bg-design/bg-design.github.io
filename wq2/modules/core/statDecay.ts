/**
 * Stat decay and natural effects system
 */

import type { PlayerStats } from './types';

export interface DecayConfig {
  energyDecayPerPixel: number;
  moodDecayPerSecond: number;
  moodDecayFromLowEnergy: number;
  lowEnergyThreshold: number;
  thirstDecayPerSecond: number;
  hungerDecayPerSecond: number;
  karmaDecayPerSecond: number;
}

export const DEFAULT_DECAY_CONFIG: DecayConfig = {
  energyDecayPerPixel: 0.01, // Energy decreases by 0.01 per pixel moved
  moodDecayPerSecond: 0.1,   // Mood decreases by 0.1 per second (slow but noticeable)
  moodDecayFromLowEnergy: 0.2, // Extra mood decay when energy is low
  lowEnergyThreshold: 30,     // Energy below 30 is considered "low"
  thirstDecayPerSecond: 0.75, // Thirst decreases by 0.75 per second (5x faster)
  hungerDecayPerSecond: 0.5, // Hunger decreases by 0.5 per second (5x faster)
  karmaDecayPerSecond: 0.01,  // Karma very slowly returns to neutral
};

/**
 * Calculate energy decay from movement distance
 */
export function calculateMovementEnergyDecay(
  distanceMoved: number,
  config: DecayConfig = DEFAULT_DECAY_CONFIG
): number {
  return -(distanceMoved * config.energyDecayPerPixel);
}

/**
 * Calculate mood change based on average of other stats
 */
export function calculateMoodDecay(
  deltaTime: number,
  currentEnergy: number,
  currentThirst: number,
  currentHunger: number,
  currentMood: number
): number {
  // Calculate the average of energy, thirst, and hunger
  const averageStats = (currentEnergy + currentThirst + currentHunger) / 3;
  
  // Calculate the difference between current mood and the average
  const moodDifference = averageStats - currentMood;
  
  // Mood moves toward the average at a rate of 2.0 per second
  // This means mood will quickly adjust to match your overall well-being
  const moodChangeRate = 2.0;
  const moodChange = moodDifference * moodChangeRate * deltaTime;
  
  return moodChange;
}

/**
 * Calculate thirst decay from time
 */
export function calculateThirstDecay(
  deltaTime: number,
  config: DecayConfig = DEFAULT_DECAY_CONFIG
): number {
  return -(deltaTime * config.thirstDecayPerSecond);
}

/**
 * Calculate hunger decay from time
 */
export function calculateHungerDecay(
  deltaTime: number,
  config: DecayConfig = DEFAULT_DECAY_CONFIG
): number {
  return -(deltaTime * config.hungerDecayPerSecond);
}

/**
 * Calculate karma decay (returns to neutral)
 */
export function calculateKarmaDecay(
  deltaTime: number,
  currentKarma: number,
  config: DecayConfig = DEFAULT_DECAY_CONFIG
): number {
  // Karma slowly returns to 0 (neutral)
  if (currentKarma > 0) {
    return -(deltaTime * config.karmaDecayPerSecond);
  } else if (currentKarma < 0) {
    return deltaTime * config.karmaDecayPerSecond;
  }
  return 0;
}

/**
 * Calculate all natural stat effects for a frame
 */
export function calculateNaturalEffects(
  distanceMoved: number,
  deltaTime: number,
  currentStats: PlayerStats,
  config: DecayConfig = DEFAULT_DECAY_CONFIG
): { energy: number; mood: number; thirst: number; hunger: number; karma: number } {
  const energyDecay = calculateMovementEnergyDecay(distanceMoved, config);
  const moodDecay = calculateMoodDecay(deltaTime, currentStats.energy, currentStats.thirst, currentStats.hunger, currentStats.mood);
  const thirstDecay = calculateThirstDecay(deltaTime, config);
  const hungerDecay = calculateHungerDecay(deltaTime, config);
  const karmaDecay = calculateKarmaDecay(deltaTime, currentStats.karma, config);
  
  return {
    energy: energyDecay,
    mood: moodDecay,
    thirst: thirstDecay,
    hunger: hungerDecay,
    karma: karmaDecay,
  };
}
