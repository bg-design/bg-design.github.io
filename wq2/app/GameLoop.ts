/**
 * Main game loop and state management
 */

import type { GameState, MovementInput } from '../modules/core';
import type { Clock, Rng, AudioPort } from '../shared/ports';
import type { SpatialIndex } from '../modules/spatial';
import type { Camera } from '../modules/camera';
import type { WorldManager } from '../modules/worlds';
import { getWorldLandmarks, getSpawnMultiplier } from '../modules/worlds';
import { calculateMovement, clampToBounds, createVec2, playerOverlapsCoin, playerOverlapsCollectible, applyStatEffect, calculateNaturalEffects, distance, updateDrugEffects, calculateTimeScale, calculateEffectiveSpeed, createEmptyInventory, useItem, ITEM_DEFINITIONS, addItemToInventory, removeItemFromInventory, getNotificationSystem, createCoinNotification, createStatNotification, createItemNotification, getActionSystem, createInitialGameTime, updateGameTime, addDrugEffect, DRUG_DEFINITIONS, createDrugEffect, getBackgroundColor } from '../modules/core';
import { spawnCollectibles } from '../modules/world';
import { spawnMoop, MoopSpawnConfig, findCollectibleMoop, collectMoop, getMoopDisplayName } from '../modules/moop';
import { pickCoin, rest } from '../modules/actions';
import { tickHellStation } from '../src/modules/world';
import { tickArtCarKinematics, createArtCar } from '../src/modules/entities';
import { consumeFuel, checkArtCarGasCanCollision } from '../src/modules/actions/fuel';
import { decideArtCarState, seekGasTarget } from '../src/modules/ai';
import { CanvasRenderer, InputHandler } from '../ui/canvas';
import { createSpatialIndex, addEntity, removeEntity, queryRadius } from '../modules/spatial';
import { createCamera, followTarget, setCameraPosition } from '../modules/camera';

export interface GameConfig {
  canvasWidth: number;
  canvasHeight: number;
  playerSize: number;
  seed: number;
  coinCount: number;
}

export class GameLoop {
  private gameState!: GameState;
  private spatialIndex: SpatialIndex;
  private camera: Camera;
  private renderer: CanvasRenderer;
  private inputHandler: InputHandler;
  private clock: Clock;
  private rng: Rng;
  private audio: AudioPort;
  private worldManager: WorldManager;
  private config: GameConfig;
  private lastTime: number = 0;
  private animationId: number | null = null;
  private lastPlayerPosition: { x: number; y: number } | null = null;
  private actionSystem: any; // Will be used for action panel
  private isPaused: boolean = false;

  constructor(
    canvas: HTMLCanvasElement,
    clock: Clock,
    rng: Rng,
    audio: AudioPort,
    worldManager: WorldManager,
    config: GameConfig
  ) {
    this.clock = clock;
    this.rng = rng;
    this.audio = audio;
    this.worldManager = worldManager;
    this.config = config;
    this.renderer = new CanvasRenderer(canvas, {
      canvasWidth: config.canvasWidth,
      canvasHeight: config.canvasHeight,
      playerSize: config.playerSize,
    });
    this.inputHandler = new InputHandler();

        // Initialize spatial index
        this.spatialIndex = createSpatialIndex(
          config.canvasWidth * 2, // 2x larger world
          config.canvasHeight * 2, // 2x larger world
          100 // 100px cell size
        );

        // Initialize camera
        this.camera = createCamera({
          viewportWidth: config.canvasWidth,
          viewportHeight: config.canvasHeight,
          zoom: 1.0,
          followSpeed: 250.0, // pixels per second - 5x faster following to keep player perfectly centered
          worldBounds: {
            minX: 0,
            minY: 0,
            maxX: 1600, // Fixed camp world width
            maxY: 1200, // Fixed camp world height
          },
        });

    // Initialize game state
    this.initializeGameState();
  }

  private initializeGameState(): void {
    // Get current world configuration
    const currentWorld = this.worldManager.getCurrentWorld();
    const worldDimensions = this.worldManager.getCurrentWorldDimensions();
    const playerSpawn = currentWorld?.spawnPosition || createVec2(
      this.config.canvasWidth / 2,
      this.config.canvasHeight / 2
    );

    // Initialize game state first
    console.log('Initializing game state with lightBattery: 0');
    this.gameState = {
      player: {
        position: playerSpawn,
        stats: {
          coins: 0,
          energy: 100,
          mood: 100,
          thirst: 100,
          hunger: 100,
          karma: 0,
          speed: 100,
          lightBattery: 0, // Start with no battery
        },
        drugs: {
          active: [],
          maxStack: 5,
        },
        inventory: (() => {
          const inventory = createEmptyInventory();
          // Add starting items
          addItemToInventory(inventory, 'Water', 3);
          addItemToInventory(inventory, 'Grilled Cheese', 1);
          addItemToInventory(inventory, 'Energy Bar', 1);
          return inventory;
        })(),
        isResting: false,
        lightsOn: true, // Lights start on by default
        totalDrugsTaken: 0,
        totalTimeOnDrugs: 0,
        gameStartTime: Date.now(),
        actualPlayTime: 0, // Track actual play time excluding pauses
        achievements: new Set<string>(),
      },
      seed: this.config.seed,
      time: createInitialGameTime(),
      gameEnded: false,
      weather: {
        type: 'clear',
        intensity: 0,
        duration: 0,
        startTime: 0
      },
      dustStorm: {
        active: false,
        intensity: 0,
        duration: 0,
        startTime: 0
      },
      coins: [], // Will be set by loadCoinsForCurrentWorld
      moop: [], // Will be set by spawnMoop
      hellStation: {
        id: 'hell-station-main',
        aabb: { x: 800, y: 400, w: 400, h: 400 }, // Moved to 10pm position (northwest) near trash fence
        spawnIntervalMs: 4000,
        maxCans: 6,
        lastSpawnAt: 0,
      },
      gasCans: [],
      artCars: [
        createArtCar(this.rng, { x: 1600, y: 1200 }),
        createArtCar(this.rng, { x: 2400, y: 2000 }),
        createArtCar(this.rng, { x: 1800, y: 800 }),
        createArtCar(this.rng, { x: 2200, y: 1600 }),
        createArtCar(this.rng, { x: 1400, y: 1800 }),
      ],
    };

    // Reset RNG to ensure deterministic coin spawning AFTER art cars are created
    this.rng.setSeed(this.config.seed);
    

    // Clear spatial index for current world
    this.spatialIndex = createSpatialIndex(
      worldDimensions.width,
      worldDimensions.height,
      100
    );

    // Load or spawn coins for current world
    this.loadCoinsForCurrentWorld();
    
    // Debug: Check if lightBattery was properly initialized
    console.log('Game state initialized, lightBattery:', this.gameState.player.stats.lightBattery);

        // Initialize last position for movement tracking
        this.lastPlayerPosition = { ...playerSpawn };

    // Listen for mute toggle events from button clicks
    window.addEventListener('toggleMute', () => this.handleMuteToggle());
    
    // Listen for inventory item click events
    window.addEventListener('useInventoryItem', (e: any) => this.handleInventoryItemClick(e.detail.itemType));
    
    // Listen for light toggle events
    window.addEventListener('toggleLights', () => this.handleLightToggle());
    
    // Listen for pause toggle events
    window.addEventListener('togglePause', () => this.handlePauseToggle());

    // Pause when menu opens, resume when it closes
    window.addEventListener('openMenu', () => {
      if (!this.isPaused) this.handlePauseToggle();
    });
    window.addEventListener('closeMenu', () => {
      if (this.isPaused) this.handlePauseToggle();
    });
    
    // Listen for action button events
    window.addEventListener('playerAction', (e: any) => this.handlePlayerAction(e.detail.action));
    
    // Initialize action system
    this.actionSystem = getActionSystem();
    console.log('Action system initialized with', this.actionSystem.actions.length, 'actions');
      }

  /**
   * Start the game loop
   */
  start(): void {
    this.lastTime = this.clock.now();
    this.tick();
  }

  /**
   * Stop the game loop
   */
  stop(): void {
    if (this.animationId !== null) {
      this.clock.cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  /**
   * Main game tick
   */
  private tick = (): void => {
    const currentTime = this.clock.now();
    const deltaTime = (currentTime - this.lastTime) / 1000; // Convert to seconds
    this.lastTime = currentTime;

    this.update(deltaTime);
    this.render();

    this.animationId = this.clock.requestAnimationFrame(this.tick);
  };

  /**
   * Update game state
   */
  private update(deltaTime: number): void {
    // Skip updates if paused or game ended
    if (this.isPaused || this.gameState.gameEnded) {
      return;
    }
    
    // Track actual play time (excluding pauses)
    this.gameState.player.actualPlayTime += deltaTime;
    
    // Update game time with both world and drug time scales
    const worldTimeScale = this.worldManager.getCurrentTimeScale();
    const drugTimeScale = calculateTimeScale(this.gameState.player.drugs);
    const effectiveTimeScale = worldTimeScale * drugTimeScale;
    
    // Debug logging for drug effects
    if (this.gameState.player.drugs.active.length > 0) {
      console.log('Effective time scale:', effectiveTimeScale);
      
    }
    
    this.gameState.time = updateGameTime(this.gameState.time, deltaTime, effectiveTimeScale);
    
    // Update weather system
    this.updateWeather(deltaTime);
    
    // If mounted on an art car, move with the car (no manual movement)
    if (this.gameState.player.mountedOn) {
      const mountedCar = this.gameState.artCars.find(car => car.id === this.gameState.player.mountedOn);
      if (mountedCar) {
        // Position player on top of the art car (adjust for car size)
        const newPosition = {
          x: mountedCar.pos.x,
          y: mountedCar.pos.y - (40 * mountedCar.size) // Position above the car, scaled by size
        };
        
        // Art car riding provides energy and mood boost
        const artCarBoost = deltaTime * 0.5; // 0.5 points per second
        this.gameState.player.stats.energy = Math.min(100, this.gameState.player.stats.energy + artCarBoost);
        this.gameState.player.stats.mood = Math.min(100, this.gameState.player.stats.mood + artCarBoost);
        
        // Check for world transition before clamping
        const oldWorldId = this.worldManager.getCurrentWorldId(); // Get old world ID before transition
        const worldTransition = this.worldManager.checkWorldTransition(
          newPosition,
          this.config.playerSize
        );

        if (worldTransition && worldTransition.success) {
          // Handle world transition
          this.handleWorldTransition(worldTransition, oldWorldId);
        } else {
          // Clamp to current world bounds
          const worldDimensions = this.worldManager.getCurrentWorldDimensions();
          if (this.worldManager.getCurrentWorldId() === 'playa') {
            // Enforce circular trash fence boundary centered at (2000,1500) with radius 1400
            const center = createVec2(2000, 1500);
            const dx = newPosition.x - center.x;
            const dy = newPosition.y - center.y;
            const distSq = dx * dx + dy * dy;
            const radius = 1400;
            if (distSq > radius * radius) {
              const dist = Math.sqrt(distSq) || 1;
              const nx = dx / dist;
              const ny = dy / dist;
              this.gameState.player.position = createVec2(center.x + nx * radius, center.y + ny * radius);
            } else {
              this.gameState.player.position = newPosition;
            }
          } else {
            this.gameState.player.position = clampToBounds(
              newPosition,
              worldDimensions.width,
              worldDimensions.height,
              this.config.playerSize
            );
          }
        }
      }
    } else {
      // Normal movement when not mounted
      const direction = this.inputHandler.getMovementDirection();
      if (direction) {
        const input: MovementInput = { direction, deltaTime };
        // Calculate effective speed based on current stats
        // Only move if not resting
        if (!this.gameState.player.isResting) {
          // Calculate effective speed including drug effects and bike
          const drugSpeedMultiplier = this.calculateDrugSpeedMultiplier();
          const bikeMultiplier = (this.gameState.player.isOnBike || this.gameState.player.mountedOn) ? 1.5 : 1.0;
          const baseEffectiveSpeed = calculateEffectiveSpeed(
            this.gameState.player.stats.speed,
            this.gameState.player.stats
          );
          const effectiveSpeed = baseEffectiveSpeed * drugSpeedMultiplier * bikeMultiplier;
          
          
          const newPosition = calculateMovement(
            this.gameState.player.position,
            input,
            effectiveSpeed
          );

        // Check for world transition before clamping
        const oldWorldId = this.worldManager.getCurrentWorldId(); // Get old world ID before transition
        const worldTransition = this.worldManager.checkWorldTransition(
          newPosition,
          this.config.playerSize
        );

        if (worldTransition && worldTransition.success) {
          // Handle world transition
          this.handleWorldTransition(worldTransition, oldWorldId);
        } else {
          // Clamp to current world bounds
          const worldDimensions = this.worldManager.getCurrentWorldDimensions();
          if (this.worldManager.getCurrentWorldId() === 'playa') {
            // Enforce circular trash fence boundary centered at (2000,1500) with radius 1400
            const center = createVec2(2000, 1500);
            const dx = newPosition.x - center.x;
            const dy = newPosition.y - center.y;
            const distSq = dx * dx + dy * dy;
            const radius = 1400 - this.config.playerSize;
            const radiusSq = radius * radius;
            if (distSq > radiusSq) {
              const dist = Math.sqrt(distSq) || 1;
              const nx = dx / dist;
              const ny = dy / dist;
              this.gameState.player.position = createVec2(center.x + nx * radius, center.y + ny * radius);
            } else {
              this.gameState.player.position = newPosition;
            }
          } else {
            this.gameState.player.position = clampToBounds(
              newPosition,
              worldDimensions.width,
              worldDimensions.height,
              this.config.playerSize
            );
          }
        }

          // Play movement sound occasionally (not every frame)
          if (Math.random() < 0.1) { // 10% chance per frame
            this.audio.playSound('playerMove', 0.1);
          }
        }
      }
    }

    // If on a bike, move the bike with the player
    if (this.gameState.player.isOnBike && this.gameState.player.mountedBikeId) {
      const worldStateManager = this.worldManager.getWorldStateManager();
      const worldId = this.worldManager.getCurrentWorldId();
      const worldState = worldStateManager.getWorldState(worldId);
      const collectibles = worldState?.items || [];
      
      const mountedBike = collectibles.find(c => c.id === this.gameState.player.mountedBikeId);
      if (mountedBike) {
        // Move the bike to the player's position
        worldStateManager.updateWorldItem(worldId, mountedBike.id, { 
          position: { ...this.gameState.player.position }
        });
      }
    }

        // Update camera to follow player
        followTarget(this.camera, this.gameState.player.position, deltaTime, this.camera.followSpeed);

    // Calculate movement distance for energy decay
    const distanceMoved = this.lastPlayerPosition
      ? distance(this.lastPlayerPosition, this.gameState.player.position)
      : 0;

    // Apply natural stat decay
    this.applyNaturalDecay(distanceMoved, deltaTime);

    // Apply resting effects
    this.applyRestingEffects(deltaTime);

    // Update last position for next frame
    this.lastPlayerPosition = { ...this.gameState.player.position };

    // Check for coin pickups
    this.checkCoinPickups();

    // Check for rest action
    this.checkRestAction();

        // Check for mute toggle
        this.checkMuteToggle();

        // Check for menu toggle
        this.checkMenuToggle();

        // Check for inventory item usage
        this.checkInventoryHotkeys();

        // Check for action hotkeys
        this.checkActionHotkeys();

        // Update Hell Station and Art Cars (only on Playa)
        if (this.worldManager.getCurrentWorldId() === 'playa') {
          this.updateHellStationAndArtCars(deltaTime);
        }

        // Update notifications
        this.updateNotifications(deltaTime);

        // Clear key pressed states for next frame
        this.inputHandler.clearKeyPressed();
  }

  /**
   * Check for coin pickups and apply effects using spatial index
   */
  private checkCoinPickups(): void {
    const playerPos = this.gameState.player.position;
    const playerRadius = this.config.playerSize / 2;
    const coinRadius = 12;

    // Query nearby entities using spatial index
    const nearbyEntities = queryRadius(this.spatialIndex, playerPos, playerRadius + coinRadius);
    
    nearbyEntities.entities.forEach((entity) => {
      const coin = this.gameState.coins.find(c => c.id === entity.id);
      if (coin && !coin.collected && playerOverlapsCoin(playerPos, playerRadius, coin.position, coinRadius)) {
        // Pick up the coin
        const result = pickCoin(coin.value);
        if (result.success) {
          coin.collected = true;
          this.gameState.player.stats = applyStatEffect(this.gameState.player.stats, result.statDelta);
          // Remove from spatial index
          removeEntity(this.spatialIndex, coin.id);
          
          // Show coin notification at the coin's world position
          createCoinNotification(coin.value, coin.position);
          
          // Update world state
          const worldId = this.worldManager.getCurrentWorldId();
          const worldStateManager = this.worldManager.getWorldStateManager();
          worldStateManager.updateWorldItem(worldId, coin.id, { collected: true });
          
          // Play coin pickup sound
          this.audio.playSound('coinPickup', 0.5);
        }
      }
    });
    
    // Check for collectible collection
    this.checkCollectibleCollection(playerPos, playerRadius);
    
    // Check for moop collection
    this.checkMoopCollection(playerPos, playerRadius);
  }
  
  /**
   * Check for moop collection
   */
  private checkMoopCollection(playerPos: any, playerRadius: number): void {
    const collectibleMoop = findCollectibleMoop(playerPos, playerRadius, this.gameState.moop as any);
    
    collectibleMoop.forEach((moopItem) => {
      const result = collectMoop(moopItem, this.gameState.player.stats);
      if (result.success) {
        // Update player stats with karma reward
        this.gameState.player.stats = result.newStats;
        
        // Mark moop as collected
        const moopIndex = this.gameState.moop.findIndex(m => m.id === moopItem.id);
        if (moopIndex !== -1) {
          this.gameState.moop[moopIndex].collected = true;
        }
        
        // Show notification with item name and karma reward
        const itemName = getMoopDisplayName(moopItem.type);
        const system = getNotificationSystem();
        system.addNotification(`+1 ${itemName} (+${result.karmaGained} karma)`, 'item', result.karmaGained, moopItem.position);
        
        // Play sound
        this.audio.playSound('coinPickup', 0.3);
      }
    });
  }

  /**
   * Update weather system with daily weather changes
   */
  private updateWeather(deltaTime: number): void {
    // Decrease weather duration
    if (this.gameState.weather.duration > 0) {
      this.gameState.weather.duration -= deltaTime;
      if (this.gameState.weather.duration <= 0) {
        // Weather ended, set to clear
        this.gameState.weather.type = 'clear';
        this.gameState.weather.intensity = 0;
        this.gameState.weather.duration = 0;
      }
    }

    // Check for new weather at the start of each day (6 AM)
    const currentHour = this.gameState.time.hour;
    const currentMinute = this.gameState.time.minute;
    
    // If it's 6 AM and we don't have active weather, roll for new weather
    if (currentHour === 6 && currentMinute === 0 && this.gameState.weather.duration <= 0) {
      const random = Math.random();
      
      if (random < 0.2) {
        // 20% chance of thunderstorm
        this.gameState.weather.type = 'thunderstorm';
        this.gameState.weather.intensity = 0.8 + Math.random() * 0.2; // 0.8 to 1.0
        this.gameState.weather.duration = 4 * 60 * 60; // 4 hours
        this.gameState.weather.startTime = this.gameState.time.totalMinutes;
        
          // Weather changed to thunderstorm (no notification)
      } else if (random < 0.7) {
        // 50% chance of nice weather (between 0.2 and 0.7)
        this.gameState.weather.type = 'nice';
        this.gameState.weather.intensity = 0.6 + Math.random() * 0.4; // 0.6 to 1.0
        this.gameState.weather.duration = 8 * 60 * 60; // 8 hours
        this.gameState.weather.startTime = this.gameState.time.totalMinutes;
        
          // Weather changed to nice (no notification)
      } else {
        // 30% chance of overcast weather
        this.gameState.weather.type = 'overcast';
        this.gameState.weather.intensity = 0.3 + Math.random() * 0.4; // 0.3 to 0.7
        this.gameState.weather.duration = 6 * 60 * 60; // 6 hours
        this.gameState.weather.startTime = this.gameState.time.totalMinutes;
      }
    }
  }

  /**
   * Check for collectible collection
   */
  private checkCollectibleCollection(playerPos: any, playerRadius: number): void {
    const worldId = this.worldManager.getCurrentWorldId();
    const worldStateManager = this.worldManager.getWorldStateManager();
    const worldState = worldStateManager.getWorldState(worldId);
    const collectibles = worldState?.items || [];
    // Check bike mount interactions
    this.checkBikeMount(collectibles);
    
    // Check art car mount interactions (only on Playa)
    if (worldId === 'playa') {
      this.checkArtCarMount();
    }
    
    collectibles.forEach((collectible) => {
      if (!collectible.collected && collectible.type !== 'coin' && collectible.type !== 'bike') {
        if (playerOverlapsCollectible(playerPos, playerRadius, collectible.position, 15)) {
          // Mark as collected
          worldStateManager.updateWorldItem(worldId, collectible.id, { collected: true });
          
          // Handle different collectible types
          switch (collectible.type) {
            case 'water':
              // Add water to inventory
              addItemToInventory(this.gameState.player.inventory, 'Water', 1);
              createItemNotification('Water', collectible.position);
              break;
            case 'food':
              // Add food to inventory based on subtype
              const foodType = collectible.data?.subtype as keyof typeof ITEM_DEFINITIONS;
              if (foodType && ITEM_DEFINITIONS[foodType]) {
                addItemToInventory(this.gameState.player.inventory, foodType, 1);
                createItemNotification(foodType, collectible.position);
              }
              break;
            case 'drug':
              // Add drug effect immediately
              const drugType = collectible.data?.subtype as any;
              if (drugType) {
                const drugEffect = createDrugEffect(drugType, 1.0);
                this.gameState.player.drugs = addDrugEffect(this.gameState.player.drugs, drugEffect);
                // Track drug statistics
                this.gameState.player.totalDrugsTaken++;
                createItemNotification(drugType, collectible.position);
                
                // Apply stat effects immediately when drug is taken (except speed and timeScale)
                const drugDefinition = DRUG_DEFINITIONS[drugType as keyof typeof DRUG_DEFINITIONS];
                if (drugDefinition && drugDefinition.effects) {
                  
                  // Create stat effect without speed and timeScale (these are handled as multipliers)
                  const statEffect = {
                    energy: drugDefinition.effects.energy,
                    mood: drugDefinition.effects.mood,
                    thirst: drugDefinition.effects.thirst,
                    hunger: drugDefinition.effects.hunger,
                    karma: drugDefinition.effects.karma,
                    // speed and timeScale are handled as multipliers, not stat changes
                  };
                  
                  this.gameState.player.stats = applyStatEffect(this.gameState.player.stats, statEffect);
                  
                  // Show stat effect notifications
                  if (drugDefinition.effects.mood && drugDefinition.effects.mood !== 0) {
                    createStatNotification('mood', drugDefinition.effects.mood, collectible.position);
                  }
                  if (drugDefinition.effects.energy && drugDefinition.effects.energy !== 0) {
                    createStatNotification('energy', drugDefinition.effects.energy, collectible.position);
                  }
                  if (drugDefinition.effects.thirst && drugDefinition.effects.thirst !== 0) {
                    createStatNotification('thirst', drugDefinition.effects.thirst, collectible.position);
                  }
                  if (drugDefinition.effects.hunger && drugDefinition.effects.hunger !== 0) {
                    createStatNotification('hunger', drugDefinition.effects.hunger, collectible.position);
                  }
                  if (drugDefinition.effects.karma && drugDefinition.effects.karma !== 0) {
                    createStatNotification('karma', drugDefinition.effects.karma, collectible.position);
                  }
                  
                  // Show speed and time notifications separately
                  if (drugDefinition.effects.speed && drugDefinition.effects.speed !== 0) {
                    createStatNotification('speed', drugDefinition.effects.speed, collectible.position);
                  }
                  if (drugDefinition.effects.timeScale && drugDefinition.effects.timeScale !== 1.0) {
                    const timeChange = ((drugDefinition.effects.timeScale - 1.0) * 100).toFixed(0);
                    const system = getNotificationSystem();
                    system.addNotification(`Time: ${parseFloat(timeChange) > 0 ? '+' : ''}${timeChange}%`, 'item', 1, collectible.position);
                  }
                }
              }
              break;
            case 'battery':
              // Add battery to inventory
              addItemToInventory(this.gameState.player.inventory, 'Battery', 1);
              createItemNotification('Battery', collectible.position);
              break;
            case 'light-bulb':
            case 'light-bulb-white':
            case 'light-bulb-red':
            case 'light-bulb-green':
            case 'light-bulb-blue':
            case 'light-bulb-orange':
            case 'light-bulb-purple':
            case 'light-bulb-rainbow':
              // Add the light bulb to inventory
              let lightBulbType: string;
              if (collectible.type === 'light-bulb') {
                lightBulbType = 'Light Bulb';
              } else {
                // Convert "light-bulb-green" to "Light Bulb Green"
                const colorName = collectible.type.replace('light-bulb-', '');
                lightBulbType = `Light Bulb ${colorName.charAt(0).toUpperCase() + colorName.slice(1)}`;
              }
              addItemToInventory(this.gameState.player.inventory, lightBulbType as any, 1);
              createItemNotification(lightBulbType, collectible.position);
              
              // Charge battery when picking up a light bulb (3 bars = 30%)
              this.gameState.player.stats.lightBattery = 30;
              console.log('Light bulb picked up - battery charged to 30%');
              
              // Check for "Not a Darkwad" achievement (first light bulb)
              if (!this.gameState.player.achievements.has('not-a-darkwad')) {
                this.gameState.player.achievements.add('not-a-darkwad');
                this.showAchievement('Not a Darkwad', '💡 You found your first light!', collectible.position);
              }
              break;
          }
          
          // Play pickup sound
          this.audio.playSound('coinPickup', 0.3);
        }
      }
    });
  }

  /**
   * Apply resting effects (energy restoration)
   */
  private applyRestingEffects(deltaTime: number): void {
    if (this.gameState.player.isResting) {
      // Restore energy while resting (12 energy per second - 4x faster)
      const energyRestore = 12 * deltaTime;
      const newEnergy = Math.min(100, this.gameState.player.stats.energy + energyRestore);
      
      if (newEnergy !== this.gameState.player.stats.energy) {
        const oldEnergy = Math.floor(this.gameState.player.stats.energy);
        this.gameState.player.stats.energy = newEnergy;
        const newEnergyFloor = Math.floor(newEnergy);
        
        // Only show notification when we gain a whole number of energy
        if (newEnergyFloor > oldEnergy) {
          const energyGained = newEnergyFloor - oldEnergy;
          
          // Show energy restoration notification
          const notificationSystem = getNotificationSystem();
          notificationSystem.addNotification(
            `+${energyGained} Energy`,
            'energy',
            energyGained,
            this.gameState.player.position
          );
        }
      }
      
      // Auto-wake at 100 energy
      if (this.gameState.player.stats.energy >= 100) {
        this.gameState.player.isResting = false;
        this.audio.playSound('buttonClick', 0.3);
      }
    }
  }

  /**
   * Apply natural stat decay from movement and time
   */
  private applyNaturalDecay(distanceMoved: number, deltaTime: number): void {
    // Update drug effects (reduce duration, remove expired) - unaffected by time multipliers
    const worldTimeScale = this.worldManager.getCurrentTimeScale();
    
    // Drug durations count down in real time - unaffected by time multipliers
    // Drugs always count down at the same speed regardless of active effects
    const gameTimeDelta = deltaTime;
    
    // Track time spent on drugs
    if (this.gameState.player.drugs.active.length > 0) {
      this.gameState.player.totalTimeOnDrugs += gameTimeDelta;
    }
    
    this.gameState.player.drugs = updateDrugEffects(this.gameState.player.drugs, gameTimeDelta);
    
    // Update dust storm
    this.updateDustStorm(deltaTime);
    
    // Check for game end on day 11
    if (this.gameState.time.day >= 11 && !this.gameState.gameEnded) {
      this.endGame();
    }

    // Drug effects are applied separately below

    // Calculate natural stat effects (decay) - use real time, not game time
    const naturalEffects = calculateNaturalEffects(
      distanceMoved,
      deltaTime, // Use real deltaTime for stat decay
      this.gameState.player.stats
    );
    
    // Apply natural decay first
    this.gameState.player.stats = applyStatEffect(
      this.gameState.player.stats,
      naturalEffects
    );
    
    // Decrease light battery over time (1 bar every 6 seconds, 10 bars = 60 seconds total)
    console.log('Battery check - lightBattery:', this.gameState.player.stats.lightBattery, 'lightsOn:', this.gameState.player.lightsOn);
    if (this.gameState.player.stats.lightBattery > 0 && this.gameState.player.lightsOn) {
      this.gameState.player.stats.lightBattery = Math.max(0, this.gameState.player.stats.lightBattery - (deltaTime * 1.67)); // 16.67% every 6 seconds = 1 bar per 6 seconds
      console.log('Battery drained to:', this.gameState.player.stats.lightBattery);
      
      // Auto-turn off lights when battery reaches 0%
      if (this.gameState.player.stats.lightBattery <= 0) {
        this.gameState.player.lightsOn = false;
        console.log('Battery dead - lights automatically turned off');
        
        // Update UI
        window.dispatchEvent(new CustomEvent('lightStateUpdate', {
          detail: { lightsOn: false }
        }));
        
        // Show notification
        const system = getNotificationSystem();
        system.addNotification('Battery dead - lights turned off', 'persistent', 0, this.gameState.player.position);
      }
    }

    // Drug effects are now applied immediately when taken, not continuously
  }

  /**
   * Check for rest action and apply effects
   */
  private checkRestAction(): void {
    if (this.inputHandler.isRestKeyPressed()) {
      const result = rest(20, 10); // Restore 20 energy and 10 mood
      if (result.success) {
        this.gameState.player.stats = applyStatEffect(this.gameState.player.stats, result.statDelta);
        // Play rest sound
        this.audio.playSound('playerRest', 0.3);
      }
    }
  }

  /**
   * Check for mute toggle and apply effects
   */
  private checkMuteToggle(): void {
    if (this.inputHandler.isMuteKeyPressed()) {
      const currentlyMuted = this.audio.isMuted();
      this.audio.setMuted(!currentlyMuted);
      // Play button click sound
      this.audio.playSound('buttonClick', 0.2);
    }
  }

  /**
   * Check for escape key to toggle menu
   */
  private checkMenuToggle(): void {
    if (this.inputHandler.isEscapeKeyPressed()) {
      // Toggle menu (menu will handle pause/resume via events)
      window.dispatchEvent(new CustomEvent('toggleMenu'));
      this.audio.playSound('buttonClick', 0.2);
    }
  }

  /**
   * Handle mute toggle from button click
   */
  private handleMuteToggle(): void {
    const currentlyMuted = this.audio.isMuted();
    this.audio.setMuted(!currentlyMuted);
    // Play button click sound
    this.audio.playSound('buttonClick', 0.2);
  }

  /**
   * Check for inventory item hotkeys
   */
  private checkInventoryHotkeys(): void {
    // Check each item definition for hotkeys
    Object.values(ITEM_DEFINITIONS).forEach(itemDef => {
      if (itemDef.hotkey && this.inputHandler.isKeyJustPressed(itemDef.hotkey)) {
        const result = useItem(this.gameState.player.inventory, itemDef.type, this.gameState.player.stats);
        if (result.success) {
          this.gameState.player.stats = result.newStats;
          this.audio.playSound('buttonClick', 0.3);
          
          // Show notifications for stat changes
          this.showItemUsageNotifications(itemDef.type);
        }
      }
    });
  }

  /**
   * Check for bike mount/dismount
   */
  private checkBikeMount(collectibles: any[]): void {
    const playerPos = this.gameState.player.position;
    const system = getNotificationSystem();
    
    // If already on bike, allow dismount
    if (this.gameState.player.isOnBike) {
      if (this.inputHandler.isKeyJustPressed(' ')) {
        this.gameState.player.isOnBike = false;
        this.gameState.player.mountedBikeId = undefined;
        this.audio.playSound('dismount', 0.3);
        system.addNotification('Dismounted from bike', 'item', 2, playerPos);
      }
      return;
    }
    
    // Check if near any bike
    const nearBike = collectibles.find(c => !c.collected && c.type === 'bike' && distance(playerPos, c.position) < 60);
    if (nearBike) {
      system.addNotification('Press Space to mount bike', 'persistent', 0, nearBike.position);
      system.updatePersistentNotificationPosition('Press Space to mount bike', nearBike.position);
      
      if (this.inputHandler.isKeyJustPressed(' ')) {
        this.gameState.player.isOnBike = true;
        this.gameState.player.mountedBikeId = nearBike.id;
        this.audio.playSound('mount', 0.3);
        system.removePersistentNotification('Press Space to mount bike');
        system.addNotification('Mounted bike!', 'item', 2, playerPos);
      }
    } else {
      // Remove the notification when not near any bike
      system.removePersistentNotification('Press Space to mount bike');
    }
  }

  /**
   * Check for art car mount/dismount
   */
  private checkArtCarMount(): void {
    const playerPos = this.gameState.player.position;
    const system = getNotificationSystem();
    
    // If already mounted, allow dismount
    if (this.gameState.player.mountedOn) {
      if (this.inputHandler.isKeyJustPressed(' ')) {
        this.gameState.player.mountedOn = null;
        this.audio.playSound('dismount', 0.3);
        system.addNotification('Dismounted from art car', 'item', 2, playerPos);
      }
      return;
    }
    
    // Check if near any art car
    const nearbyCar = this.gameState.artCars.find(car => {
      const dist = Math.hypot(playerPos.x - car.pos.x, playerPos.y - car.pos.y);
      return dist < 80; // Mount range
    });
    
    if (nearbyCar) {
      system.addNotification('Press Space to board art car', 'persistent', 0, nearbyCar.pos); // Persistent notification that follows the car
      // Update the notification position to follow the car
      system.updatePersistentNotificationPosition('Press Space to board art car', nearbyCar.pos);
      
      if (this.inputHandler.isKeyJustPressed(' ')) {
        this.gameState.player.mountedOn = nearbyCar.id;
        this.audio.playSound('mount', 0.3);
        system.removePersistentNotification('Press Space to board art car'); // Remove the persistent notification
        system.addNotification(`Boarded ${nearbyCar.id === 'art-car-1' ? 'Disco Bus' : 'Fire Dragon'}!`, 'item', 2, playerPos);
      }
    } else {
      // Remove the notification when not near any car
      system.removePersistentNotification('Press Space to board art car');
    }
  }

  /**
   * Check for action hotkeys
   */
  private checkActionHotkeys(): void {
    // If resting, any key press wakes up the player
    if (this.gameState.player.isResting) {
      if (this.inputHandler.isAnyKeyPressed()) {
        this.gameState.player.isResting = false;
        this.audio.playSound('buttonClick', 0.3);
        return;
      }
    }
    
    // Check for rest action (R key)
    if (this.inputHandler.isKeyJustPressed('r')) {
      this.handleRestAction();
    }
    
    // Check for light toggle (L key)
    if (this.inputHandler.isKeyJustPressed('l')) {
      this.handleLightToggle();
    }
  }

  /**
   * Handle rest action
   */
  private handleRestAction(): void {
    if (this.gameState.player.isResting) {
      // Stop resting
      this.gameState.player.isResting = false;
      this.audio.playSound('buttonClick', 0.3);
    } else {
      // Start resting
      this.gameState.player.isResting = true;
      this.audio.playSound('playerRest', 0.5);
    }
  }

  /**
   * Handle inventory item click
   */
  private handleInventoryItemClick(itemType: string): void {
    // Wake up if resting
    if (this.gameState.player.isResting) {
      this.gameState.player.isResting = false;
      console.log('Woke up from rest to use item:', itemType);
    }
    
    // Check if it's a light bulb - if so, drop it instead of using it
    if (itemType.includes('Light Bulb')) {
      this.dropLightBulb(itemType);
      return;
    }
    
    const result = useItem(this.gameState.player.inventory, itemType as any, this.gameState.player.stats);
    if (result.success) {
      this.gameState.player.stats = result.newStats;
      this.audio.playSound('buttonClick', 0.3);
      
      // Show notifications for stat changes
      this.showItemUsageNotifications(itemType);
    }
  }

  /**
   * Drop a light bulb on the playa (creates moop and gives negative karma)
   */
  private dropLightBulb(itemType: string): void {
    // Check if player has the light bulb
    const currentCount = this.gameState.player.inventory.items.get(itemType as any) || 0;
    if (currentCount <= 0) {
      console.log('No light bulbs to drop');
      return;
    }

    // Remove one light bulb from inventory
    removeItemFromInventory(this.gameState.player.inventory, itemType as any, 1);

    // Create moop item at player position
    const moopItem = {
      id: `dropped-light-${Date.now()}-${Math.random()}`,
      type: 'light-bulb',
      position: { ...this.gameState.player.position },
      radius: 8,
      karmaReward: -5, // Negative karma for creating moop
      collected: false
    };

    // Add to moop array
    this.gameState.moop.push(moopItem);

    // Apply negative karma
    this.gameState.player.stats.karma = Math.max(0, this.gameState.player.stats.karma - 5);

    // Show notification
    const system = getNotificationSystem();
    system.addNotification(`Dropped ${itemType} (-5 karma)`, 'karma', -5, this.gameState.player.position);

    // Play sound
    this.audio.playSound('buttonClick', 0.3);

    console.log(`Dropped ${itemType} at position:`, this.gameState.player.position);
  }

  /**
   * Handle light toggle
   */
  private handleLightToggle(): void {
    console.log('handleLightToggle called - current lightsOn:', this.gameState.player.lightsOn);
    this.gameState.player.lightsOn = !this.gameState.player.lightsOn;
    console.log('handleLightToggle - new lightsOn:', this.gameState.player.lightsOn);
    
    // Update UI
    window.dispatchEvent(new CustomEvent('lightStateUpdate', { 
      detail: { lightsOn: this.gameState.player.lightsOn } 
    }));
    
    // Play sound
    this.audio.playSound('buttonClick', 0.3);
    
    // Show notification
    const system = getNotificationSystem();
    const message = this.gameState.player.lightsOn ? 'Lights turned on' : 'Lights turned off';
    system.addNotification(message, 'persistent', 0, this.gameState.player.position);
    
    console.log('Lights toggled:', this.gameState.player.lightsOn);
  }

  /**
   * Handle pause toggle
   */
  private handlePauseToggle(): void {
    this.isPaused = !this.isPaused;
    this.audio.playSound('buttonClick', 0.2);
    console.log('Game paused:', this.isPaused);
    
    // Dispatch pause state update event
    window.dispatchEvent(new CustomEvent('pauseStateUpdate', { detail: { isPaused: this.isPaused } }));
  }

  /**
   * Handle player action from button click
   */
  private handlePlayerAction(action: string): void {
    console.log('Player action:', action);
    
    switch (action) {
      case 'rest':
        this.handleRestAction();
        break;
      case 'explore':
        // Wake up if resting
        if (this.gameState.player.isResting) {
          this.gameState.player.isResting = false;
          console.log('Woke up from rest to explore');
        }
        break;
      case 'gift':
        // Wake up if resting
        if (this.gameState.player.isResting) {
          this.gameState.player.isResting = false;
          console.log('Woke up from rest to give gift');
        }
        // TODO: Implement gift giving
        break;
      case 'help':
        // Wake up if resting
        if (this.gameState.player.isResting) {
          this.gameState.player.isResting = false;
          console.log('Woke up from rest to help stranger');
        }
        // TODO: Implement help stranger
        break;
      case 'battle':
        // Wake up if resting
        if (this.gameState.player.isResting) {
          this.gameState.player.isResting = false;
          console.log('Woke up from rest for silly battle');
        }
        // TODO: Implement silly battle
        break;
      case 'meditate':
        // Wake up if resting
        if (this.gameState.player.isResting) {
          this.gameState.player.isResting = false;
          console.log('Woke up from rest to meditate');
        }
        // TODO: Implement meditation
        break;
      default:
        console.log('Unknown action:', action);
    }
    
    this.audio.playSound('buttonClick', 0.2);
  }

  /**
   * Update Hell Station and Art Cars
   */
  private updateDustStorm(deltaTime: number): void {
    // Dust storms can occur randomly, more likely during certain times
    const currentHour = this.gameState.time.hour;
    const isDustStormTime = (currentHour >= 14 && currentHour <= 18) || (currentHour >= 2 && currentHour <= 6);
    
    if (this.gameState.dustStorm.active) {
      // Update active dust storm
      this.gameState.dustStorm.duration -= deltaTime;
      
      if (this.gameState.dustStorm.duration <= 0) {
        // End dust storm
        this.gameState.dustStorm.active = false;
        this.gameState.dustStorm.intensity = 0;
        this.gameState.dustStorm.duration = 0;
      } else {
        // Vary intensity during storm
        const stormAge = (Date.now() - this.gameState.dustStorm.startTime) / 1000;
        const baseIntensity = 0.7;
        const variation = Math.sin(stormAge * 0.5) * 0.2;
        this.gameState.dustStorm.intensity = Math.max(0.3, Math.min(1.0, baseIntensity + variation));
      }
    } else if (isDustStormTime && Math.random() < 0.001) { // 0.1% chance per frame during dust storm hours
      // Start new dust storm
      this.gameState.dustStorm.active = true;
      this.gameState.dustStorm.intensity = 0.8;
      this.gameState.dustStorm.duration = 30 + Math.random() * 60; // 30-90 seconds
      this.gameState.dustStorm.startTime = Date.now();
    }
  }

  private endGame(): void {
    this.gameState.gameEnded = true;
    
    // Calculate game statistics
    const actualPlayTimeSeconds = (Date.now() - this.gameState.player.gameStartTime) / 1000; // actual real-world play time in seconds
    const drugPercentage = actualPlayTimeSeconds > 0 ? (this.gameState.player.totalTimeOnDrugs / actualPlayTimeSeconds) * 100 : 0;
    
    // Show end game screen
    this.showEndGameScreen({
      coins: this.gameState.player.stats.coins,
      karma: this.gameState.player.stats.karma,
      drugPercentage: drugPercentage,
      totalDrugsTaken: this.gameState.player.totalDrugsTaken,
      totalGameTime: actualPlayTimeSeconds
    });
  }

  /**
   * Show achievement notification
   */
  private showAchievement(title: string, description: string, position: Vec2): void {
    const system = getNotificationSystem();
    system.addNotification(`🏆 ${title}`, 'achievement', 3, position);
    
    // Also show a special achievement notification
    setTimeout(() => {
      system.addNotification(description, 'achievement', 2, position);
    }, 1000);
  }

  private showEndGameScreen(stats: {
    coins: number;
    karma: number;
    drugPercentage: number;
    totalDrugsTaken: number;
    totalGameTime: number;
  }): void {
    // Create end game overlay
    const overlay = document.createElement('div');
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.9);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 10000;
      font-family: 'Courier New', monospace;
      color: white;
    `;
    
    const content = document.createElement('div');
    content.style.cssText = `
      background: linear-gradient(135deg, #1a1a2e, #16213e);
      padding: 40px;
      border-radius: 20px;
      border: 2px solid #ff6b6b;
      text-align: center;
      max-width: 600px;
      box-shadow: 0 0 50px rgba(255, 107, 107, 0.3);
    `;
    
    const gameTimeHours = Math.floor(stats.totalGameTime / 3600);
    const gameTimeMinutes = Math.floor((stats.totalGameTime % 3600) / 60);
    
    content.innerHTML = `
      <h1 style="color: #ff6b6b; font-size: 2.5em; margin-bottom: 20px; text-shadow: 0 0 10px #ff6b6b;">
        🎉 YOU WIN BURNING MAN! 🎉
      </h1>
      <h2 style="color: #4ecdc4; margin-bottom: 30px;">Your Burning Man Journey Ends</h2>
      
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px;">
        <div style="background: rgba(255, 255, 255, 0.1); padding: 20px; border-radius: 10px;">
          <h3 style="color: #ffd93d; margin-bottom: 10px;">💰 Coins Collected</h3>
          <div style="font-size: 2em; font-weight: bold;">${stats.coins}</div>
        </div>
        
        <div style="background: rgba(255, 255, 255, 0.1); padding: 20px; border-radius: 10px;">
          <h3 style="color: #ffd93d; margin-bottom: 10px;">🌟 Karma</h3>
          <div style="font-size: 2em; font-weight: bold;">${Math.round(stats.karma)}</div>
        </div>
        
        <div style="background: rgba(255, 255, 255, 0.1); padding: 20px; border-radius: 10px;">
          <h3 style="color: #ffd93d; margin-bottom: 10px;">💊 Time on Drugs</h3>
          <div style="font-size: 2em; font-weight: bold;">${stats.drugPercentage.toFixed(1)}%</div>
        </div>
        
        <div style="background: rgba(255, 255, 255, 0.1); padding: 20px; border-radius: 10px;">
          <h3 style="color: #ffd93d; margin-bottom: 10px;">🧪 Total Drugs Taken</h3>
          <div style="font-size: 2em; font-weight: bold;">${stats.totalDrugsTaken}</div>
        </div>
      </div>
      
      <div style="background: rgba(255, 255, 255, 0.1); padding: 20px; border-radius: 10px; margin-bottom: 30px;">
        <h3 style="color: #ffd93d; margin-bottom: 10px;">⏱️ Total Play Time</h3>
        <div style="font-size: 1.5em;">${gameTimeHours}h ${gameTimeMinutes}m</div>
      </div>
      
      <p style="color: #4ecdc4; font-size: 1.2em; margin-bottom: 30px;">
        ${stats.drugPercentage > 50 ? 
          'You really embraced the psychedelic experience! 🌈' : 
          stats.drugPercentage > 25 ? 
          'You had a balanced journey with some enhanced experiences! ✨' :
          'You stayed mostly sober and focused on the experience! 🧘'
        }
      </p>
      
      <button onclick="location.reload()" style="
        background: linear-gradient(45deg, #ff6b6b, #4ecdc4);
        border: none;
        padding: 15px 30px;
        font-size: 1.2em;
        color: white;
        border-radius: 25px;
        cursor: pointer;
        font-family: 'Courier New', monospace;
        font-weight: bold;
        transition: transform 0.3s ease;
      " onmouseover="this.style.transform='scale(1.05)'" onmouseout="this.style.transform='scale(1)'">
        🔄 Play Again
      </button>
    `;
    
    overlay.appendChild(content);
    document.body.appendChild(overlay);
  }

  private updateHellStationAndArtCars(deltaTime: number): void {
    if (!this.gameState.hellStation) return;

    // Update Hell Station spawning
    const now = this.clock.now();
    const result = tickHellStation(
      this.gameState.hellStation,
      this.gameState.gasCans,
      now,
      this.rng
    );
    this.gameState.hellStation = result.station;
    this.gameState.gasCans = result.cans;

    // Update Art Cars
    this.gameState.artCars = this.gameState.artCars.map((car) => {
      const consumed = consumeFuel(car, deltaTime);
      
      // Check for gas can collision and refuel
      const collisionResult = checkArtCarGasCanCollision(consumed, this.gameState.gasCans);
      let carWithFuel = collisionResult.car;
      
      // Remove gas can if art car consumed it
      if (collisionResult.collided && collisionResult.canId) {
        this.gameState.gasCans = this.gameState.gasCans.filter(can => can.id !== collisionResult.canId);
      }
      
      const newState = decideArtCarState(carWithFuel, {
        cans: this.gameState.gasCans,
        station: this.gameState.hellStation!,
        player: this.gameState.player
      });
      const target = seekGasTarget(carWithFuel, {
        cans: this.gameState.gasCans,
        station: this.gameState.hellStation!,
        player: this.gameState.player
      });

      let updatedCar = { ...carWithFuel, state: newState };

      // Simple steering toward target using design-specific speed
      if (target.targetPos && newState === 'seekFuel') {
        const dx = target.targetPos.x - updatedCar.pos.x;
        const dy = target.targetPos.y - updatedCar.pos.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 5) {
          const baseSpeed = 40;
          const speed = baseSpeed * updatedCar.speed; // Use design-specific speed
          updatedCar.vel.x = (dx / dist) * speed;
          updatedCar.vel.y = (dy / dist) * speed;
        }
      }

      return tickArtCarKinematics(updatedCar, deltaTime, { width: 4000, height: 3000 });
    });
  }

  /**
   * Update notifications
   */
  private updateNotifications(deltaTime: number): void {
    const notificationSystem = getNotificationSystem();
    notificationSystem.updateNotifications(deltaTime);
  }


  /**
   * Calculate speed multiplier from active drug effects
   */
  private calculateDrugSpeedMultiplier(): number {
    let speedMultiplier = 1.0;
    
    for (const drug of this.gameState.player.drugs.active) {
      if (drug.effects.speed) {
        speedMultiplier += (drug.effects.speed * drug.intensity) / 100; // Convert percentage to multiplier
      }
    }
    
    return Math.max(0.1, speedMultiplier); // Minimum 10% speed
  }

  /**
   * Show notifications for item usage
   */
  private showItemUsageNotifications(itemType: string): void {
    const itemDef = ITEM_DEFINITIONS[itemType as keyof typeof ITEM_DEFINITIONS];
    if (!itemDef) return;

    // Show notifications at the player's current position
    const playerPosition = this.gameState.player.position;

    // Show notifications for each stat effect
    if (itemDef.effects.thirst) {
      createStatNotification('thirst', itemDef.effects.thirst, playerPosition);
    }
    if (itemDef.effects.hunger) {
      createStatNotification('hunger', itemDef.effects.hunger, playerPosition);
    }
    if (itemDef.effects.energy) {
      createStatNotification('energy', itemDef.effects.energy, playerPosition);
    }
    if (itemDef.effects.mood) {
      createStatNotification('mood', itemDef.effects.mood, playerPosition);
    }
    if (itemDef.effects.karma) {
      createStatNotification('karma', itemDef.effects.karma, playerPosition);
    }
    if (itemDef.effects.speed) {
      createStatNotification('speed', itemDef.effects.speed, playerPosition);
    }
  }

  /**
   * Handle world transition
   */
  private handleWorldTransition(transition: any, oldWorldId: string): void {
    // Handle bike persistence across world transitions
    if (this.gameState.player.isOnBike && this.gameState.player.mountedBikeId) {
      const worldStateManager = this.worldManager.getWorldStateManager();
      
      // Get the bike from the old world
      const oldWorldState = worldStateManager.getWorldState(oldWorldId);
      const oldCollectibles = oldWorldState?.items || [];
      const mountedBike = oldCollectibles.find(c => c.id === this.gameState.player.mountedBikeId);
      
      if (mountedBike) {
        // Remove bike from old world
        worldStateManager.removeWorldItem(oldWorldId, mountedBike.id);
        
        // Add bike to new world at player's new position
        const newWorldId = transition.newWorldId;
        const bikeInNewWorld = {
          ...mountedBike,
          position: { ...transition.newPosition }
        };
        worldStateManager.addWorldItem(newWorldId, bikeInNewWorld);
      }
    }
    
    // Update player position to new world position
    this.gameState.player.position = transition.newPosition;
    
    // Update camera to new world
    const worldDimensions = this.worldManager.getCurrentWorldDimensions();
    this.camera.worldBounds = {
      minX: 0,
      minY: 0,
      maxX: worldDimensions.width,
      maxY: worldDimensions.height
    };
    
    // Set camera position to new player position
    setCameraPosition(this.camera, transition.newPosition);
    
    // Rebuild spatial index for new world
    this.spatialIndex = createSpatialIndex(
      worldDimensions.width,
      worldDimensions.height,
      100
    );
    
    // Load or spawn coins for new world
    this.loadCoinsForCurrentWorld();
    
    // Play transition sound
    this.audio.playSound('gameStart', 0.3);
    
    // Log transition message
    if (transition.message) {
      console.log(transition.message);
    }
  }

  /**
   * Load or spawn coins for current world
   */
  private loadCoinsForCurrentWorld(): void {
    const worldId = this.worldManager.getCurrentWorldId();
    const worldStateManager = this.worldManager.getWorldStateManager();
    const worldState = worldStateManager.getWorldState(worldId);
    
    // Check if coins already exist in world state
    const existingCoins = worldState.items.filter(item => item.type === 'coin');
    
    if (existingCoins.length > 0) {
      // Load existing coins
      this.gameState.coins = existingCoins.map(item => ({
        id: item.id,
        position: item.position,
        value: item.data?.value || 1,
        collected: item.collected
      }));
      
      // Add non-collected coins to spatial index
      this.gameState.coins.forEach(coin => {
        if (!coin.collected) {
          addEntity(this.spatialIndex, {
            id: coin.id,
            position: coin.position,
            radius: 8,
          });
        }
      });
    } else {
      // Spawn new coins for this world
      this.spawnCoinsForCurrentWorld();
    }
  }

  /**
   * Spawn coins for current world
   */
  private spawnCoinsForCurrentWorld(): void {
    const worldId = this.worldManager.getCurrentWorldId();
    const worldDimensions = this.worldManager.getCurrentWorldDimensions();
    const playerSpawn = this.gameState.player.position;
    const worldStateManager = this.worldManager.getWorldStateManager();
    
    this.rng.setSeed(this.config.seed + worldId.length);
    
    // Calculate spawn multiplier based on current day
    const spawnMultiplier = getSpawnMultiplier(this.gameState.time.day);
    // Additional world-based multiplier (Playa needs 4x items)
    const worldIdForSpawns = this.worldManager.getCurrentWorldId();
    const worldSpawnBoost = worldIdForSpawns === 'playa' ? 4 : 1;
    
    // Spawn all collectibles (coins, water, food, drugs, bikes) with day-based multiplier
    const collectibles = spawnCollectibles(
      this.rng,
      worldDimensions.width,
      worldDimensions.height,
      playerSpawn,
      this.spatialIndex,
      Math.floor(this.config.coinCount * spawnMultiplier * worldSpawnBoost * 4), // coin count with 4x Playa boost
      Math.floor(8 * spawnMultiplier * worldSpawnBoost * 4), // water count with 4x Playa boost
      Math.floor(10 * spawnMultiplier * worldSpawnBoost * 4), // food count with 4x Playa boost
      Math.floor(5 * spawnMultiplier * worldSpawnBoost * 4),  // drug count with 4x Playa boost
      Math.floor(3.33 * spawnMultiplier * worldSpawnBoost * 4),  // bike count with 4x Playa boost (1/3 as common)
      Math.floor(2 * spawnMultiplier * worldSpawnBoost * 4),  // light bulb count with 4x Playa boost
      Math.floor(1 * spawnMultiplier * worldSpawnBoost * 4)  // battery count with 4x Playa boost
    );
    
    // Spawn moop items with day-based multiplier
    const moopConfig: MoopSpawnConfig = {
      count: Math.floor(6 * spawnMultiplier * worldSpawnBoost), // moop count with multiplier
      minDistanceFromPlayer: 100,
      minDistanceFromOtherMoop: 30,
      worldBounds: {
        minX: 0,
        maxX: worldDimensions.width,
        minY: 0,
        maxY: worldDimensions.height,
      },
    };
    
    const moop = spawnMoop(moopConfig, playerSpawn, [], this.rng);
    
    // Add moop to game state
    this.gameState.moop = moop;
    
    console.log(`Spawned ${moop.length} moop items for world ${worldId}`);
    
    // Filter out just the coins for the coins array (for backward compatibility)
    this.gameState.coins = collectibles
      .filter(c => c.type === 'coin')
      .map(c => ({
        id: c.id,
        position: c.position,
        value: c.value,
        collected: c.collected,
      }));
    
    // Add all collectibles to world state
    collectibles.forEach(collectible => {
      worldStateManager.addWorldItem(worldId, {
        id: collectible.id,
        type: collectible.type,
        position: collectible.position,
        collected: collectible.collected,
        data: { 
          value: collectible.value,
          subtype: collectible.subtype
        }
      });
    });
  }

  /**
   * Render the game
   */
  private render(): void {
    const baseBackgroundColor = this.worldManager.getCurrentWorldBackgroundColor();
    const backgroundColor = getBackgroundColor(this.gameState.time, baseBackgroundColor);
    const landmarks = getWorldLandmarks(this.worldManager.getCurrentWorldId(), this.gameState.time);
    const isMuted = this.audio.isMuted();
    const worldTimeScale = this.worldManager.getCurrentTimeScale();
    const drugTimeScale = calculateTimeScale(this.gameState.player.drugs);
    const effectiveTimeScale = worldTimeScale * drugTimeScale;
    const activeDrugs = this.gameState.player.drugs.active;
    
    // Get collectibles from world state
    const worldId = this.worldManager.getCurrentWorldId();
    const worldStateManager = this.worldManager.getWorldStateManager();
    const worldState = worldStateManager.getWorldState(worldId);
    const collectibles = worldState?.items || [];
    
    this.renderer.render(this.gameState, this.camera, this.spatialIndex, backgroundColor, landmarks, isMuted, effectiveTimeScale, activeDrugs, this.worldManager.getCurrentWorldId(), collectibles, this.gameState.moop as any);
    
    // Dispatch game state update event for HTML UI panels
    window.dispatchEvent(new CustomEvent('gameStateUpdate', { detail: this.gameState }));
  }

  /**
   * Get current game state (for debugging)
   */
  getGameState(): GameState {
    return { ...this.gameState };
  }

  /**
   * Reset game state
   */
  reset(): void {
    this.initializeGameState();
  }

  /**
   * Load a saved game state
   */
  loadGameState(savedState: GameState): void {
    this.gameState = { ...savedState };
    this.lastPlayerPosition = { ...savedState.player.position };
    
    // Rebuild spatial index with saved coins
    this.spatialIndex = createSpatialIndex(
      this.config.canvasWidth * 2, // 2x larger world
      this.config.canvasHeight * 2, // 2x larger world
      100
    );
    
    // Add all non-collected coins to spatial index
    savedState.coins.forEach(coin => {
      if (!coin.collected) {
        addEntity(this.spatialIndex, {
          id: coin.id,
          position: coin.position,
          radius: 8, // Coin radius
        });
      }
    });
    
    // Update camera to follow the loaded player position
    setCameraPosition(this.camera, savedState.player.position);
  }
}
