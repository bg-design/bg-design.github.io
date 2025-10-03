/**
 * Shared Type Definitions - Extracted from wombatquest.html
 * Common types used across all modules
 * 
 * Note: This file contains JSDoc type definitions for documentation purposes.
 * In JavaScript, these are just comments and don't affect runtime behavior.
 */

/**
 * @typedef {Object} Coordinates
 * @property {number} x
 * @property {number} y
 */

/**
 * @typedef {Object} Size
 * @property {number} w
 * @property {number} h
 */

/**
 * @typedef {Object} AABB
 * @property {number} x
 * @property {number} y
 * @property {number} w
 * @property {number} h
 */

/**
 * @typedef {string} ChunkId Format: "x,y"
 */

/**
 * @typedef {Object} PlayerStats
 * @property {number} coin - 0-9999
 * @property {number} karma - 0-9999
 * @property {number} hunger - 0-100
 * @property {number} thirst - 0-100
 * @property {number} energy - 0-100
 * @property {number} mood - 0-100
 */

/**
 * @typedef {Object} GameTime
 * @property {number} day - 1-11+
 * @property {number} hour - 0-23
 * @property {number} minute - 0-59
 */

/**
 * @typedef {Object} DrugEffects
 * @property {ActiveDrug[]} activeDrugs
 * @property {number} timeMultiplier - 0.01-10.0
 * @property {number} timeStopDuration - frames remaining
 * @property {number} timeAccumulator
 * @property {number} whipitsCount
 */

/**
 * @typedef {Object} ActiveDrug
 * @property {string} name
 * @property {string} emoji
 * @property {number} speedMultiplier
 * @property {boolean} hallucinating
 * @property {number} duration - hours
 * @property {number} startTime - Date.now()
 * @property {string} [mysteryType]
 * @property {number} [timeMultiplier]
 * @property {string} [specialEffects]
 * @property {number} [moodBoost]
 * @property {number} [energyBoost]
 */

/**
 * @typedef {Object} TripStats
 * @property {number} totalDrugsConsumed
 * @property {Set<string>} drugsTried
 * @property {number} timeHigh - frames
 * @property {number} totalPlayTime - frames
 * @property {number} gameStartTime - Date.now()
 * @property {number} totalDistance - pixels
 * @property {number} lastX
 * @property {number} lastY
 * @property {number} walkingTime
 * @property {number} bikingTime
 * @property {number} artCarTime
 * @property {number} meditationCount
 * @property {number} highMoodTime
 * @property {number} lowMoodTime
 * @property {number} wellRestedTime
 * @property {number} exhaustedTime
 * @property {number} fastTime
 * @property {number} slowTime
 */

/**
 * @typedef {Object} Player
 * @property {number} worldX
 * @property {number} worldY
 * @property {number} screenX
 * @property {number} screenY
 * @property {number} w
 * @property {number} h
 * @property {number} speed
 * @property {string} color
 * @property {PlayerStats} stats
 * @property {Object} inventory
 * @property {Object} flags
 * @property {GameTime} time
 * @property {boolean} inCamp
 * @property {boolean} hasSeenCampDialogue
 * @property {DrugEffects} drugEffects
 * @property {TripStats} tripStats
 * @property {Object} cooldowns
 * @property {Object} lastActionTimes
 */

/**
 * @typedef {Object} GameState
 * @property {boolean} ended
 * @property {Object} finalScore
 */

/**
 * @typedef {Object} StatEffect
 * @property {number} [coin]
 * @property {number} [karma]
 * @property {number} [hunger]
 * @property {number} [thirst]
 * @property {number} [energy]
 * @property {number} [mood]
 */

/**
 * @typedef {Object} WorldConfig
 * @property {number} chunkSize
 * @property {number} playaRadius
 * @property {number} populationMultiplier
 */

/**
 * @typedef {Object} WorldEntities
 * @property {Array} decorations
 * @property {Array} coins
 * @property {Array} waterBottles
 * @property {Array} snacks
 * @property {Array} bikes
 * @property {Array} artCars
 * @property {Array} moop
 * @property {Array} drugs
 * @property {Array} danceFloors
 * @property {Array} artInstallations
 * @property {Array} orgyDomes
 * @property {Array} homeCamps
 * @property {Array} centerCamps
 * @property {Array} fuelStations
 * @property {Array} npcs
 * @property {Array} gasolineTanks
 */

/**
 * @typedef {Function} RNG
 * @returns {number} Random number between 0 and 1
 */