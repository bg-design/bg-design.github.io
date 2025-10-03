/**
 * World landmarks and structures
 */

import type { Vec2, GameTime } from '../core';
import { createVec2 } from '../core';

export interface Landmark {
  id: string;
  type: 'man' | 'temple' | 'trashFence' | 'artCar' | 'camp';
  position: Vec2;
  size: number;
  color: string;
  description: string;
  buildingProgress?: number; // 0-1, how built it is
  isBurning?: boolean; // If it's currently burning
  isBurned?: boolean; // If it's already burned down
  handsUp?: boolean; // If The Man's hands are raised (Saturday)
}

/**
 * Get landmarks for a specific world with building progress based on current time
 */
export function getWorldLandmarks(worldId: string, gameTime?: GameTime): Landmark[] {
  switch (worldId) {
    case 'playa':
      return getPlayaLandmarks(gameTime);
    case 'camp':
      return getCampLandmarks();
    case 'danceStage':
      return getDanceStageLandmarks();
    default:
      return [];
  }
}

/**
 * Calculate spawn multiplier based on day of week
 * Items become more populated as the week goes on, then clear out Sat-Mon
 */
export function getSpawnMultiplier(day: number): number {
  // 10-day timeline: Day1=Sat ... Day10=Mon (next week)
  if (day <= 1) return 0.2; // Day1 Sat - sparse
  if (day <= 2) return 0.4; // Day2 Sun
  if (day <= 3) return 0.6; // Day3 Mon
  if (day <= 4) return 0.8; // Day4 Tue
  if (day <= 5) return 1.0; // Day5 Wed - peak
  if (day <= 6) return 1.0; // Day6 Thu - peak
  if (day <= 7) return 1.0; // Day7 Fri - peak
  if (day === 8) return 0.67; // Day8 Sat - 1/3 disappear
  if (day === 9) return 0.33; // Day9 Sun - another 1/3 disappear
  return 0.1; // Day10 Mon - last 1/3 disappear
}

/**
 * Calculate building progress based on day of week
 * Sunday = 1, Monday = 2, ..., Saturday = 7
 */
function getBuildingProgress(day: number, structure: 'man' | 'temple'): { progress: number; isBurning: boolean; isBurned: boolean; handsUp?: boolean } {
  if (structure === 'man') {
    // 10-day timeline, Day1 = Saturday; Man burns on Day8 (Saturday)
    if (day <= 1) return { progress: 0, isBurning: false, isBurned: false }; // Day1 Sat - not started
    if (day === 2) return { progress: 0.1, isBurning: false, isBurned: false }; // Day2 Sun - foundation
    if (day === 3) return { progress: 0.3, isBurning: false, isBurned: false }; // Day3 Mon - pole
    if (day === 4) return { progress: 0.5, isBurning: false, isBurned: false }; // Day4 Tue - figure appears
    if (day === 5) return { progress: 0.7, isBurning: false, isBurned: false }; // Day5 Wed - details
    if (day === 6) return { progress: 0.9, isBurning: false, isBurned: false }; // Day6 Thu - almost complete
    if (day === 7) return { progress: 1.0, isBurning: false, isBurned: false }; // Day7 Fri - complete
    if (day === 8) return { progress: 1.0, isBurning: true, isBurned: false, handsUp: true }; // Day8 Sat - hands up & burning
    if (day >= 9) return { progress: 0, isBurning: false, isBurned: true }; // Day9+ Sun/Mon - ashes
    return { progress: 0, isBurning: false, isBurned: false };
  } else {
    // Temple burns on Day9 (Sunday)
    if (day <= 1) return { progress: 0, isBurning: false, isBurned: false }; // Day1 Sat
    if (day === 2) return { progress: 0.15, isBurning: false, isBurned: false }; // Day2 Sun
    if (day === 3) return { progress: 0.35, isBurning: false, isBurned: false }; // Day3 Mon
    if (day === 4) return { progress: 0.55, isBurning: false, isBurned: false }; // Day4 Tue
    if (day === 5) return { progress: 0.75, isBurning: false, isBurned: false }; // Day5 Wed
    if (day === 6) return { progress: 0.9, isBurning: false, isBurned: false }; // Day6 Thu
    if (day === 7) return { progress: 1.0, isBurning: false, isBurned: false }; // Day7 Fri - complete
    if (day === 8) return { progress: 1.0, isBurning: false, isBurned: false }; // Day8 Sat - complete
    if (day === 9) return { progress: 1.0, isBurning: true, isBurned: false }; // Day9 Sun - burning
    if (day >= 10) return { progress: 0, isBurning: false, isBurned: true }; // Day10 Mon - ashes
    return { progress: 0, isBurning: false, isBurned: false };
  }
}

/**
 * Playa landmarks - The Man, Temple, and trash fence with building progress
 */
function getPlayaLandmarks(gameTime?: GameTime): Landmark[] {
  const landmarks: Landmark[] = [];
  const day = gameTime?.day || 1;
  const hour = gameTime?.hour ?? 0;
  
  // The Man - center of the playa (3x larger)
  const manStatus = getBuildingProgress(day, 'man');
  // Burn only Saturday night (Day 8) at 20:00 or later
  const manIsBurningAtNight = day === 8 && hour >= 20;
  landmarks.push({
    id: 'the-man',
    type: 'man',
    position: createVec2(2000, 1500), // Center of enlarged 4000x3000 playa
    size: 180, // 3x larger (original was 60)
    color: manIsBurningAtNight ? '#ff0000' : manStatus.isBurned ? '#444444' : '#ff6b35',
    description: manIsBurningAtNight ? 'The Man is burning!' : manStatus.isBurned ? 'The Man has burned' : manStatus.handsUp ? 'The Man - hands raised, ready to burn!' : 'The Man - the center of Burning Man',
    buildingProgress: manStatus.progress,
    isBurning: manIsBurningAtNight,
    isBurned: manStatus.isBurned,
    handsUp: manStatus.handsUp
  });
  
  // The Temple - 6x further away from The Man (twice as far as before)
  const templeStatus = getBuildingProgress(day, 'temple');
  // Burn only Sunday night (Day 9) at 20:00 or later
  const templeIsBurningAtNight = day === 9 && hour >= 20;
  landmarks.push({
    id: 'the-temple',
    type: 'temple',
    position: createVec2(2000, 600), // Much further north from the center
    size: 120, // Larger size for more detail
    color: templeIsBurningAtNight ? '#ff0000' : templeStatus.isBurned ? '#444444' : '#8b4513',
    description: templeIsBurningAtNight ? 'The Temple is burning!' : templeStatus.isBurned ? 'The Temple has burned' : 'The Temple - a place of reflection and remembrance',
    buildingProgress: templeStatus.progress,
    isBurning: templeIsBurningAtNight,
    isBurned: templeStatus.isBurned
  });
  
  // Trash fence - perimeter circle around everything
  landmarks.push({
    id: 'trash-fence',
    type: 'trashFence',
    position: createVec2(2000, 1500), // Center
    size: 1400, // Larger radius for bigger world
    color: '#2c3e50', // Dark gray
    description: 'Trash fence - the perimeter of the event'
  });
  
  // Your camp on the playa - inside the fence, halfway from The Man toward the left
  landmarks.push({
    id: 'playa-camp',
    type: 'camp',
    position: createVec2(1200, 1500), // Halfway from center (2000,1500) toward left
    size: 100, // Will be drawn as a rectangle
    color: '#27ae60', // Green
    description: 'Your camp on the playa - walk here to return to main camp'
  });
  
  // Hell Station - gas can spawning area at 10pm (northwest) near trash fence
  landmarks.push({
    id: 'hell-station',
    type: 'artCar',
    position: createVec2(1000, 600), // 10pm position (northwest) near trash fence
    size: 80,
    color: '#ff6b35', // Orange-red
    description: 'Hell Station - spawns gas cans for art cars'
  });
  
  // Art Car 1 - "The Disco Bus"
  landmarks.push({
    id: 'art-car-1',
    type: 'artCar',
    position: createVec2(1600, 1200), // Northwest area
    size: 60,
    color: '#f06', // Pink
    description: 'The Disco Bus - needs fuel to keep the party going'
  });

  // Art Car 2 - "The Fire Dragon"
  landmarks.push({
    id: 'art-car-2',
    type: 'artCar',
    position: createVec2(2400, 2000), // Southeast area
    size: 60,
    color: '#9b59b6', // Purple
    description: 'The Fire Dragon - cruising the playa with flames'
  });
  
  return landmarks;
}

/**
 * Camp landmarks
 */
function getCampLandmarks(): Landmark[] {
  return []; // No landmarks in camp - just tents and boundary
}

/**
 * Dance stage landmarks
 */
function getDanceStageLandmarks(): Landmark[] {
  return [
    {
      id: 'main-stage',
      type: 'artCar',
      position: createVec2(600, 400), // Center of dance stage
      size: 50,
      color: '#9b59b6', // Purple
      description: 'Main dance stage with pulsing lights'
    }
  ];
}
