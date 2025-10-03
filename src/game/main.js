/**
 * Main Game Module - Coordinates all game systems
 * Extracted from wombatquest.html
 */

import { createPlayer, createDefaultGameState } from '../core/state.js';
import { generateChunkContent, generateCampWorld, generateCenterCamp, generatePlayerHomeBase } from '../world/generation.js';

/**
 * Main game class that coordinates all systems
 */
export class WombatQuestGame {
  constructor(canvas, rng = Math.random, clock = Date.now) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.rng = rng;
    this.clock = clock;
    
    this.player = createPlayer();
    this.entities = this.createEmptyEntities();
    this.gameState = createDefaultGameState();
    this.generatedChunks = new Set();
    this.gamePaused = false;
    this.currentWorld = 'camp';
    
    this.initializeGame();
  }

  /**
   * Initialize the game world
   */
  initializeGame() {
    // Generate initial camp world
    const campWorld = generateCampWorld({ chunkSize: 400, playaRadius: 3000, populationMultiplier: 0.1 }, this.rng);
    this.mergeEntities(campWorld);
    
    // Generate center camp
    const centerCamp = generateCenterCamp({ chunkSize: 400, playaRadius: 3000, populationMultiplier: 0.1 }, this.rng);
    this.mergeEntities(centerCamp);
    
    // Generate player home base
    const homeBase = generatePlayerHomeBase({ chunkSize: 400, playaRadius: 3000, populationMultiplier: 0.1 }, this.rng);
    this.mergeEntities(homeBase);
    
    // Set player spawn location
    this.player.worldX = 0;
    this.player.worldY = 0;
    this.player.inCamp = true;
  }

  /**
   * Create empty entities structure
   */
  createEmptyEntities() {
    return {
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
  }

  /**
   * Merge new entities into existing entities
   */
  mergeEntities(newEntities) {
    Object.keys(newEntities).forEach(key => {
      const entityArray = newEntities[key];
      if (Array.isArray(entityArray)) {
        this.entities[key].push(...entityArray);
      }
    });
  }

  /**
   * Get current game context
   */
  getContext() {
    return {
      player: this.player,
      entities: this.entities,
      camera: { x: 0, y: 0 }, // Will be calculated
      input: { keys: {} }, // Will be populated by input system
      canvas: this.canvas,
      ctx: this.ctx,
      gameState: this.gameState,
      manStructure: { x: 0, y: 0, w: 100, h: 100, burned: false, limbs: 0, maxLimbs: 4, constructionProgress: 0 },
      templeStructure: { x: 0, y: 0, w: 100, h: 100, burned: false, constructionProgress: 0 }
    };
  }

  /**
   * Update game state
   */
  update(deltaTime) {
    if (this.gamePaused) return;
    
    // For now, just delegate to the old update function
    // This will be replaced with the new modular system later
    if (typeof window !== 'undefined' && window.update) {
      window.update();
    }
  }

  /**
   * Update player state
   */
  updatePlayer(deltaTime) {
    // Player movement and stat updates will be handled by other systems
    // This is a placeholder for the main update loop
  }

  /**
   * Update all entities
   */
  updateEntities(deltaTime) {
    // Entity updates will be handled by other systems
    // This is a placeholder for the main update loop
  }

  /**
   * Generate chunks near the player
   */
  generateNearbyChunks() {
    const chunkSize = 400;
    const playerChunkX = Math.floor(this.player.worldX / chunkSize);
    const playerChunkY = Math.floor(this.player.worldY / chunkSize);
    
    // Generate chunks in a 3x3 grid around the player
    for (let x = playerChunkX - 1; x <= playerChunkX + 1; x++) {
      for (let y = playerChunkY - 1; y <= playerChunkY + 1; y++) {
        const chunkId = `${x},${y}`;
        if (!this.generatedChunks.has(chunkId)) {
          const chunkContent = generateChunkContent(x, y, { chunkSize, playaRadius: 3000, populationMultiplier: 0.1 }, this.rng);
          this.mergeEntities(chunkContent);
          this.generatedChunks.add(chunkId);
        }
      }
    }
  }

  /**
   * Update camera position
   */
  updateCamera() {
    // Camera follows player
    // This will be implemented by the rendering system
  }

  /**
   * Render the game
   */
  render() {
    // For now, just delegate to the old draw function
    // This will be replaced with the new modular system later
    if (typeof window !== 'undefined' && window.draw) {
      window.draw();
    }
  }

  /**
   * Render the game world
   */
  renderWorld() {
    // World rendering will be handled by the rendering system
    // This is a placeholder
  }

  /**
   * Render the player
   */
  renderPlayer() {
    // Player rendering will be handled by the rendering system
    // This is a placeholder
  }

  /**
   * Render UI elements
   */
  renderUI() {
    // UI rendering will be handled by the UI system
    // This is a placeholder
  }

  /**
   * Handle input
   */
  handleInput(key, pressed) {
    // Input handling will be implemented by the input system
    // This is a placeholder
  }

  /**
   * Pause/unpause the game
   */
  setPaused(paused) {
    this.gamePaused = paused;
  }

  /**
   * Get game state
   */
  getGameState() {
    return {
      player: this.player,
      gameState: this.gameState,
      currentWorld: this.currentWorld,
      gamePaused: this.gamePaused
    };
  }

  /**
   * Restart the game
   */
  restart() {
    this.player = createPlayer();
    this.entities = this.createEmptyEntities();
    this.gameState = createDefaultGameState();
    this.generatedChunks.clear();
    this.gamePaused = false;
    this.currentWorld = 'camp';
    this.initializeGame();
  }
}

// Global functions for HTML onclick handlers
window.nextDialogue = function() {
  if (typeof window.currentDialogue === 'undefined') {
    window.currentDialogue = 0;
  }
  
  const dialogues = [
    // Intro Banter
    {
      text: "Camper 1 (half-asleep): \"Wait… did anyone actually pack the rebar this year?\"",
      scene: "intro-banter"
    },
    {
      text: "Camper 2 (confident but wrong): \"Of course. I made a list. Then I lost the list. But spiritually? We're ready.\"",
      scene: "intro-banter"
    },
    {
      text: "Camper 3 (snacking already): \"I brought 40 granola bars. That's radical self-reliance, right?\"",
      scene: "intro-banter"
    },
    {
      text: "Camper 1: \"That's just… breakfast. For one day.\"",
      scene: "intro-banter"
    },
    {
      text: "Camper 4 (peering out the dusty window): \"Look at the horizon. Is that dust or is the sky already trying to kill us?\"",
      scene: "intro-banter"
    },
    {
      text: "Camper 2: \"That's just the playa saying 'welcome home.' Don't worry, we'll be fine. The RV loves us.\"",
      scene: "intro-banter"
    },
    {
      text: "[The RV shudders and coughs.]",
      scene: "intro-banter"
    },
    // The Line
    {
      text: "Camper 1 (groaning): \"How is it possible to wait three hours to drive into a city that doesn't exist?\"",
      scene: "the-line"
    },
    {
      text: "Camper 3: \"At least we have snacks. Uh… wait. We had snacks.\"",
      scene: "the-line"
    },
    {
      text: "Camper 4: \"Some guy just walked by juggling glow sticks. He's been here since sunrise.\"",
      scene: "the-line"
    },
    {
      text: "Camper 2 (excited): \"Patience, friends. We're about to be reborn as dusty desert angels.\"",
      scene: "the-line"
    }
  ];
  
  if (window.currentDialogue < dialogues.length) {
    const dialogue = dialogues[window.currentDialogue];
    const sceneElement = document.getElementById(dialogue.scene);
    const dialogueText = sceneElement.querySelector('.dialogue-text');
    const continueBtn = sceneElement.querySelector('.dialogue-btn:not(.skip-btn)');
    
    // Show the current scene
    document.querySelectorAll('.story-scene').forEach(scene => {
      scene.style.display = 'none';
    });
    sceneElement.style.display = 'block';
    
    // Update the dialogue text
    dialogueText.innerHTML = `<p>${dialogue.text}</p>`;
    
    // Hide skip intro button after first dialogue
    if (window.currentDialogue === 1) {
      const skipBtn = sceneElement.querySelector('.skip-btn');
      if (skipBtn) {
        skipBtn.style.display = 'none';
      }
    }
    
    window.currentDialogue++;
    
    // If this is the last dialogue, hide the continue button and show gate ritual
    if (window.currentDialogue >= dialogues.length) {
      if (continueBtn) {
        continueBtn.style.display = 'none';
      }
      
      // Pre-load the gate ritual text to eliminate delay
      const gateRitual = document.getElementById('gate-ritual');
      const gateText = gateRitual.querySelector('.dialogue-text');
      gateText.innerHTML = `
        <p><strong>Gatekeeper (in neon fur):</strong> "Welcome home. Step outside. Do you know what time it is?"</p>
        <p><em>It's time for the dust angel ritual - a classic Burning Man tradition!</em></p>
      `;
      
      // Immediate transition to gate ritual - no delay
      gateRitual.style.display = 'block';
    } else {
      // Show continue button for non-final dialogues
      if (continueBtn) {
        continueBtn.style.display = 'inline-block';
      }
    }
  }
};

window.startGameInCamp = function() {
  console.log('🌍 Starting game in camp mode');
  
  // Hide story screen and show game
  document.getElementById('story-screen').style.display = 'none';
  document.getElementById('game-container').style.display = 'block';
  
  // Initialize the time system - this is critical!
  if (typeof window.lastTimeUpdate === 'undefined') {
    window.lastTimeUpdate = Date.now();
  }
  
  // Set player to be in camp initially
  if (typeof window.player !== 'undefined') {
    window.player.inCamp = true;
  }
  if (typeof window.currentWorld !== 'undefined') {
    window.currentWorld = 'camp';
  }
  
  // Switch to camp layer
  if (typeof window.switchToCampLayer === 'function') {
    window.switchToCampLayer();
  }
  
  // Generate camp world if not already generated
  if (typeof window.campWorldGenerated === 'undefined' || !window.campWorldGenerated) {
    if (typeof window.generateCampWorld === 'function') {
      window.generateCampWorld();
      window.campWorldGenerated = true;
    }
  }
  
  // Initialize displays
  if (typeof window.updateStatsDisplay === 'function') {
    window.updateStatsDisplay();
  }
  if (typeof window.updateLiveActivities === 'function') {
    window.updateLiveActivities();
  }
  if (typeof window.updateTimeDisplay === 'function') {
    window.updateTimeDisplay();
  }
  if (typeof window.updateInventoryDisplay === 'function') {
    window.updateInventoryDisplay();
  }
  if (typeof window.updateDrugEffectsDisplay === 'function') {
    window.updateDrugEffectsDisplay();
  }
  
  // Start the game loop
  if (typeof window.loop === 'function') {
    window.loop();
  }
};

window.skipIntro = function() {
  // Skip directly to the game
  window.startGameInCamp();
};
