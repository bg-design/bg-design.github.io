/**
 * Main entry point for Wombat Quest modules
 */

export { WombatQuestGame } from './game/main.js';
export { 
  createPlayer, 
  createDefaultGameState, 
  applyStatEffect, 
  advanceTime,
  isWithinBoundaries,
  checkCollision,
  calculateDistance,
  getChunkId,
  getChunkCoordinates,
  getChunkBounds,
  isPointInAABB,
  calculateStatSpeedMultiplier,
  calculateTotalSpeedMultiplier,
  calculateTimeMultiplier,
  calculateMoodChangeFromNeeds,
  calculateGradualMoodChange,
  calculateRealtimeMoodChange,
  isPlayerInCamp,
  isPlayerAtHomeCamp,
  calculateEnergyDrain
} from './core/state.js';
export { 
  generateChunkContent, 
  generateCampWorld, 
  generateCenterCamp, 
  generatePlayerHomeBase 
} from './world/generation.js';
export * from './shared/constants.js';
export * from './shared/types.js';
