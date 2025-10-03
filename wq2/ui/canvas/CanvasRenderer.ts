/**
 * Canvas rendering adapter for the game
 */

import type { GameState, Vec2 } from '../../modules/core';
import { calculateEffectiveSpeed, getInventoryItems, getNotificationSystem, formatGameTime, getTimeOfDayDescription, isOnDrug, isNightTime } from '../../modules/core';
import { renderArtCars } from '../../src/ui/canvas/renderArtCars';
import type { SpatialIndex } from '../../modules/spatial';
import type { Camera } from '../../modules/camera';
import type { Landmark } from '../../modules/worlds';
import type { MoopItem } from '../../modules/moop';
import { queryRect } from '../../modules/spatial';
import { worldToScreen, isWorldPositionVisible } from '../../modules/camera';
import { getMoopEmoji } from '../../modules/moop';

export interface RenderConfig {
  canvasWidth: number;
  canvasHeight: number;
  playerSize: number;
}

export class CanvasRenderer {
  private ctx: CanvasRenderingContext2D;
  private config: RenderConfig;
  private canvas: HTMLCanvasElement;
  private muteButtonBounds: { x: number; y: number; width: number; height: number } | null = null;
  private inventoryItemBounds: Array<{ x: number; y: number; width: number; height: number; itemType: string }> = [];

  constructor(canvas: HTMLCanvasElement, config: RenderConfig) {
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get 2D context from canvas');
    }
    this.ctx = ctx;
    this.config = config;
    this.canvas = canvas;

    // Set canvas size
    canvas.width = config.canvasWidth;
    canvas.height = config.canvasHeight;

    // Add click event listener
    this.setupMouseEvents();
  }

  /**
   * Setup mouse event listeners
   */
  private setupMouseEvents(): void {
    this.canvas.addEventListener('click', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      // Check mute button
      if (this.muteButtonBounds && 
          x >= this.muteButtonBounds.x && 
          x <= this.muteButtonBounds.x + this.muteButtonBounds.width &&
          y >= this.muteButtonBounds.y && 
          y <= this.muteButtonBounds.y + this.muteButtonBounds.height) {
        window.dispatchEvent(new CustomEvent('toggleMute'));
        return;
      }
      
      // Check inventory items
      for (const itemBounds of this.inventoryItemBounds) {
        if (x >= itemBounds.x && 
            x <= itemBounds.x + itemBounds.width &&
            y >= itemBounds.y && 
            y <= itemBounds.y + itemBounds.height) {
          window.dispatchEvent(new CustomEvent('useInventoryItem', { detail: { itemType: itemBounds.itemType } }));
          return;
        }
      }
    });
  }

  /**
   * Clear the canvas
   */
  clear(backgroundColor: string = '#2c3e50'): void {
    this.ctx.fillStyle = backgroundColor;
    this.ctx.fillRect(0, 0, this.config.canvasWidth, this.config.canvasHeight);
  }

  /**
   * Render the player as an orange wombat avatar
   */
  renderPlayer(position: Vec2, camera: Camera, isResting: boolean = false, mood: number = 50, isMounted: boolean = false): void {
    const { playerSize } = this.config;
    const halfSize = playerSize / 2;

    // Check if player is visible
    if (!isWorldPositionVisible(position, camera, halfSize)) {
      return;
    }

    // Transform world position to screen position
    const screenPos = worldToScreen(position, camera);
    const screenSize = playerSize * camera.zoom;

    // Draw player as orange square (wombat body)
    this.ctx.fillStyle = '#ff6b35'; // Orange color like in target image
    this.ctx.fillRect(
      screenPos.x - screenSize / 2,
      screenPos.y - screenSize / 2,
      screenSize,
      screenSize
    );

    // Draw player border (darker orange, or special color when mounted)
    this.ctx.strokeStyle = isMounted ? '#00ff00' : '#e55a2b'; // Green when mounted
    this.ctx.lineWidth = isMounted ? 3 * camera.zoom : 2 * camera.zoom; // Thicker when mounted
    this.ctx.strokeRect(
      screenPos.x - screenSize / 2,
      screenPos.y - screenSize / 2,
      screenSize,
      screenSize
    );

    // Draw wombat features
    this.drawWombatFeatures(screenPos, screenSize, camera.zoom, isResting, mood);
  }


  /**
   * Calculate speed multiplier from active drug effects
   */
  private calculateDrugSpeedMultiplier(drugs: any): number {
    let speedMultiplier = 1.0;
    
    for (const drug of drugs.active) {
      if (drug.effects.speed) {
        speedMultiplier += (drug.effects.speed * drug.intensity) / 100; // Convert percentage to multiplier
      }
    }
    
    return Math.max(0.1, speedMultiplier); // Minimum 10% speed
  }

  /**
   * Draw wombat facial features
   */
  private drawWombatFeatures(screenPos: Vec2, screenSize: number, _zoom: number, isResting: boolean = false, mood: number = 50): void {
    // Calculate blinking state based on time (only when not resting)
    const time = Date.now() * 0.001; // Convert to seconds
    const blinkCycle = Math.sin(time * 2) * 0.5 + 0.5; // 0 to 1, cycles every ~3 seconds
    const isBlinking = !isResting && blinkCycle < 0.1; // Only blink when not resting
    
    // Determine facial expression based on mood
    let eyeExpression = 'normal';
    
    if (mood >= 80) {
      eyeExpression = 'happy';
    } else if (mood >= 60) {
      eyeExpression = 'normal';
    } else if (mood >= 40) {
      eyeExpression = 'worried';
    } else if (mood >= 20) {
      eyeExpression = 'sad';
    } else {
      eyeExpression = 'very_sad';
    }

    // Ears (orange rectangles on top) - much bigger and visible
    this.ctx.fillStyle = '#ff6b35'; // Same orange as body for ears
    const earWidth = screenSize * 0.25; // Much bigger ears
    const earHeight = screenSize * 0.35; // Much bigger ears
    
    // Left ear - positioned on top left
    this.ctx.fillRect(
      screenPos.x - screenSize * 0.4,
      screenPos.y - screenSize * 0.6,
      earWidth,
      earHeight
    );

    // Right ear - positioned on top right
    this.ctx.fillRect(
      screenPos.x + screenSize * 0.15,
      screenPos.y - screenSize * 0.6,
      earWidth,
      earHeight
    );

    if (isResting) {
      // Draw "X" eyes when resting - 80% size with 2px thickness
      this.ctx.strokeStyle = '#2c3e50'; // Dark gray/black for X eyes
      this.ctx.lineWidth = 2; // 2px thickness
      
      const eyeSize = screenSize * 0.24; // 80% of awake eye size (0.3 * 0.8 = 0.24)
      
      // Left X eye
      this.ctx.beginPath();
      this.ctx.moveTo(screenPos.x - screenSize * 0.2 - eyeSize/2, screenPos.y - screenSize * 0.1 - eyeSize/2);
      this.ctx.lineTo(screenPos.x - screenSize * 0.2 + eyeSize/2, screenPos.y - screenSize * 0.1 + eyeSize/2);
      this.ctx.moveTo(screenPos.x - screenSize * 0.2 + eyeSize/2, screenPos.y - screenSize * 0.1 - eyeSize/2);
      this.ctx.lineTo(screenPos.x - screenSize * 0.2 - eyeSize/2, screenPos.y - screenSize * 0.1 + eyeSize/2);
      this.ctx.stroke();

      // Right X eye
      this.ctx.beginPath();
      this.ctx.moveTo(screenPos.x + screenSize * 0.2 - eyeSize/2, screenPos.y - screenSize * 0.1 - eyeSize/2);
      this.ctx.lineTo(screenPos.x + screenSize * 0.2 + eyeSize/2, screenPos.y - screenSize * 0.1 + eyeSize/2);
      this.ctx.moveTo(screenPos.x + screenSize * 0.2 + eyeSize/2, screenPos.y - screenSize * 0.1 - eyeSize/2);
      this.ctx.lineTo(screenPos.x + screenSize * 0.2 - eyeSize/2, screenPos.y - screenSize * 0.1 + eyeSize/2);
      this.ctx.stroke();
    } else {
      // Eyes (black dots inside white rectangles when awake) - MUCH BIGGER
      const eyeWidth = screenSize * 0.3; // Much bigger eyes
      let eyeHeight = isBlinking ? screenSize * 0.05 : screenSize * 0.2; // Squint when blinking
      let pupilRadius = isBlinking ? 0 : screenSize * 0.08; // Hide pupils when blinking
      
      // Adjust eye shape based on expression - make differences more dramatic
      if (eyeExpression === 'happy' && !isBlinking) {
        // Happy eyes - much smaller and curved upward
        eyeHeight = screenSize * 0.12;
        pupilRadius = screenSize * 0.05;
      } else if (eyeExpression === 'worried' && !isBlinking) {
        // Worried eyes - normal size but angled down
        eyeHeight = screenSize * 0.2;
        pupilRadius = screenSize * 0.08;
      } else if (eyeExpression === 'sad' && !isBlinking) {
        // Sad eyes - droopy and smaller
        eyeHeight = screenSize * 0.12;
        pupilRadius = screenSize * 0.06;
      } else if (eyeExpression === 'very_sad' && !isBlinking) {
        // Very sad eyes - very droopy and tiny
        eyeHeight = screenSize * 0.08;
        pupilRadius = screenSize * 0.04;
      }
      
      // Left eye - white rectangle
      this.ctx.fillStyle = '#ffffff'; // White background
      this.ctx.fillRect(
        screenPos.x - screenSize * 0.2 - eyeWidth / 2,
        screenPos.y - screenSize * 0.1 - eyeHeight / 2,
        eyeWidth,
        eyeHeight
      );
      
      // Left eye - black dot (pupil) - only if not blinking
      if (!isBlinking) {
        this.ctx.fillStyle = '#2c3e50'; // Black pupil
        this.ctx.beginPath();
        this.ctx.arc(screenPos.x - screenSize * 0.2, screenPos.y - screenSize * 0.1, pupilRadius, 0, Math.PI * 2);
        this.ctx.fill();
      }

      // Right eye - white rectangle
      this.ctx.fillStyle = '#ffffff'; // White background
      this.ctx.fillRect(
        screenPos.x + screenSize * 0.2 - eyeWidth / 2,
        screenPos.y - screenSize * 0.1 - eyeHeight / 2,
        eyeWidth,
        eyeHeight
      );
      
      // Right eye - black dot (pupil) - only if not blinking
      if (!isBlinking) {
        this.ctx.fillStyle = '#2c3e50'; // Black pupil
        this.ctx.beginPath();
        this.ctx.arc(screenPos.x + screenSize * 0.2, screenPos.y - screenSize * 0.1, pupilRadius, 0, Math.PI * 2);
        this.ctx.fill();
      }
    }

    // Nose (triangle in center) - bigger
    this.ctx.fillStyle = '#2c3e50'; // Dark gray/black for nose
    const noseSize = screenSize * 0.15; // Bigger nose
    this.ctx.beginPath();
    this.ctx.moveTo(screenPos.x, screenPos.y + screenSize * 0.05);
    this.ctx.lineTo(screenPos.x - noseSize/2, screenPos.y + screenSize * 0.2);
    this.ctx.lineTo(screenPos.x + noseSize/2, screenPos.y + screenSize * 0.2);
    this.ctx.closePath();
    this.ctx.fill();

    // Mouth expression based on mood
    this.ctx.strokeStyle = '#2c3e50';
    this.ctx.lineWidth = 3;
    this.ctx.beginPath();
    
    if (mood >= 80) {
      // Happy - smile
      this.ctx.arc(screenPos.x, screenPos.y + screenSize * 0.35, screenSize * 0.15, 0, Math.PI);
    } else if (mood >= 60) {
      // Normal - straight line
      this.ctx.moveTo(screenPos.x - screenSize * 0.1, screenPos.y + screenSize * 0.35);
      this.ctx.lineTo(screenPos.x + screenSize * 0.1, screenPos.y + screenSize * 0.35);
    } else if (mood >= 40) {
      // Worried - slight frown
      this.ctx.arc(screenPos.x, screenPos.y + screenSize * 0.4, screenSize * 0.1, Math.PI, 0);
    } else if (mood >= 20) {
      // Sad - frown
      this.ctx.arc(screenPos.x, screenPos.y + screenSize * 0.45, screenSize * 0.12, Math.PI, 0);
    } else {
      // Very sad - deep frown
      this.ctx.arc(screenPos.x, screenPos.y + screenSize * 0.5, screenSize * 0.15, Math.PI, 0);
    }
    
    this.ctx.stroke();
  }

  /**
   * Render a coin
   */
  renderCoin(position: Vec2, _value: number, camera: Camera): void {
    const radius = 2.4; // 20% of original size (12 * 0.2 = 2.4)
    
    // Check if coin is visible
    if (!isWorldPositionVisible(position, camera, radius)) {
      return;
    }
    
    // Transform world position to screen position
    const screenPos = worldToScreen(position, camera);
    const screenRadius = radius * camera.zoom;
    
    // Draw coin circle
    this.ctx.fillStyle = '#f1c40f';
    this.ctx.beginPath();
    this.ctx.arc(screenPos.x, screenPos.y, screenRadius, 0, Math.PI * 2);
    this.ctx.fill();
    
    // Draw coin border
    this.ctx.strokeStyle = '#f39c12';
    this.ctx.lineWidth = 1 * camera.zoom;
    this.ctx.stroke();
    
    // No text on coins anymore
  }

  /**
   * Render a moop item
   */
  renderMoop(moop: MoopItem, camera: Camera): void {
    // Check if moop is visible
    if (!isWorldPositionVisible(moop.position, camera, moop.radius)) {
      return;
    }
    
    // Transform world position to screen position
    const screenPos = worldToScreen(moop.position, camera);
    const emojiSize = 16 * camera.zoom;
    
    // Get emoji for moop type
    const emoji = getMoopEmoji(moop.type);
    
    // Draw emoji
    this.ctx.font = `${emojiSize}px Arial`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(emoji, screenPos.x, screenPos.y);
  }

  /**
   * Render a collectible item
   */
  renderCollectible(position: Vec2, type: string, subtype: string | undefined, camera: Camera, id?: string): void {
    // Check if collectible is visible
    if (!isWorldPositionVisible(position, camera, 20)) {
      return;
    }
    
    // Transform world position to screen position
    const screenPos = worldToScreen(position, camera);
    const emojiSize = (type === 'bike' ? 50 : 20) * camera.zoom; // Bikes are 2.5x larger
    
    // Get emoji based on type and subtype
    let emoji: string;
    switch (type) {
      case 'coin':
        // Keep coins as circles (don't render here, they're handled separately)
        return;
      case 'water':
        emoji = '💧';
        break;
      case 'food':
        emoji = this.getFoodEmoji(subtype);
        break;
      case 'drug':
        emoji = this.getDrugEmoji(subtype);
        break;
      case 'bike':
        emoji = '🚲';
        break;
      case 'light-bulb':
        emoji = '💡';
        break;
      case 'light-bulb-white':
        emoji = '💡';
        break;
      case 'light-bulb-red':
        emoji = '🔴';
        break;
      case 'light-bulb-green':
        emoji = '🟢';
        break;
      case 'light-bulb-blue':
        emoji = '🔵';
        break;
      case 'light-bulb-orange':
        emoji = '🟠';
        break;
      case 'light-bulb-purple':
        emoji = '🟣';
        break;
      case 'light-bulb-rainbow':
        emoji = '🌈';
        break;
      case 'battery':
        emoji = '🔋';
        break;
      default:
        emoji = '📦';
    }
    
    // Special effects for colored light bulbs
    if (type.startsWith('light-bulb')) {
      this.renderColoredLightBulb(screenPos, emojiSize, type);
      return;
    }
    
    // Draw glow for drugs (purple) and energy-drink (golden)
    if (type === 'drug') {
      const isEnergy = subtype === 'energy-drink';
      const glowOuter = isEnergy ? 'rgba(255, 215, 0, 0.7)' : '#9b59b6';
      const glowInner = isEnergy ? 'rgba(255, 165, 0, 0.8)' : '#e74c3c';
      // Outer glow
      this.ctx.shadowColor = glowOuter;
      this.ctx.shadowBlur = 30 * camera.zoom;
      this.ctx.font = `${emojiSize}px Arial`;
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(emoji, screenPos.x, screenPos.y);
      
      // Inner glow
      this.ctx.shadowColor = glowInner; // inner glow
      this.ctx.shadowBlur = 15 * camera.zoom;
      this.ctx.fillText(emoji, screenPos.x, screenPos.y);
      
      // Main emoji
      this.ctx.shadowBlur = 0;
      this.ctx.fillText(emoji, screenPos.x, screenPos.y);
    } else if (type === 'bike') {
      // Draw bike with colored emoji using canvas filters
      const bikeColors = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c', '#e67e22', '#34495e'];
      const colorIndex = parseInt((id || '0').split('_').pop() || '0') % bikeColors.length;
      const bikeColor = bikeColors[colorIndex];
      
      // Apply color filter to the bike emoji
      this.ctx.save();
      this.ctx.filter = `hue-rotate(${this.getHueRotation(bikeColor)}deg) saturate(1.5) brightness(1.2)`;
      
      // Draw bike emoji with color filter
      this.ctx.font = `${emojiSize}px Arial`;
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(emoji, screenPos.x, screenPos.y);
      
      this.ctx.restore();
    } else {
      // Draw regular emoji
      this.ctx.font = `${emojiSize}px Arial`;
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(emoji, screenPos.x, screenPos.y);
    }
  }

  private getFoodEmoji(subtype?: string): string {
    const foodEmojis: Record<string, string> = {
      'Grilled Cheese': '🧀',
      'Energy Bar': '⚡',
      'Veggie Burger': '🍔',
      'Fruit Salad': '🥗',
      'Pizza Slice': '🍕',
      'Smoothie': '🥤',
      'Popsicle': '🍭',
      'Burrito': '🌯',
      'Taco': '🌮',
      'Ice Cream': '🍦',
      'Corn Dog': '🌭',
      'Funnel Cake': '🧁',
      'Nachos': '🌮', // Nachos should be nachos, not corn
      'Cotton Candy': '🍬',
    };
    return foodEmojis[subtype || ''] || '🍎';
  }

  private getDrugEmoji(subtype?: string): string {
    const drugEmojis: Record<string, string> = {
      'molly': '💎', // Diamond for molly
      'shrooms': '🍄',
      'acid': '🧪',
      'dmt': '💫',
      'salvia': '🌿',
      'whipits': '🎈',
      'energy-drink': '🍼', // Glowing baby bottle for energy drink
      'bike': '🚲',
      'mystery-pill': '❓', // Question mark for mystery
      'mystery-snowball': '❄️',
      'cigarette': '🚬', // Cigarette or joint (random)
      'joint': '🚬', // Cigarette or joint (random)
      'vodka': '🥃', // Shot glass emoji for vodka
      'mda': '💎', // Diamond for mda
      '2c-i': '🧪',
      'caffeine': '☕', // Coffee cup for caffeine
      'alcohol': '🍺', // Beer emoji for alcohol
      'mdma': '💎', // Diamond for mdma
      'mushrooms': '🍄',
      'weed': '🌿',
      'cocaine': '⚪', // White circle for cocaine
      'ketamine': '⚪', // White circle for ketamine
      'cannabis': '🌿', // Plant for cannabis
    };
    return drugEmojis[subtype || ''] || '❓'; // Question mark fallback instead of pill
  }

  private getHueRotation(color: string): number {
    // Convert hex color to hue rotation angle
    const colorMap: Record<string, number> = {
      '#e74c3c': 0,    // Red
      '#3498db': 200,  // Blue  
      '#2ecc71': 120,  // Green
      '#f39c12': 30,   // Orange
      '#9b59b6': 270,  // Purple
      '#1abc9c': 180,  // Teal
      '#e67e22': 20,   // Dark Orange
      '#34495e': 210,  // Dark Gray
    };
    return colorMap[color] || 0;
  }

  /**
   * Render light battery meter as 10 rectangular blocks
   */
  private renderLightBatteryMeter(x: number, y: number, batteryLevel: number): void {
    // Label
    this.ctx.fillStyle = '#ecf0f1';
    this.ctx.font = '14px Arial';
    this.ctx.textAlign = 'left';
    this.ctx.fillText('Light:', x, y);
    
    // 10 rectangular blocks
    const blockWidth = 12;
    const blockHeight = 14;
    const blockSpacing = 2;
    const startX = x + 50;
    
    for (let i = 0; i < 10; i++) {
      const blockX = startX + (i * (blockWidth + blockSpacing));
      const blockThreshold = (i + 1) * 10; // Each block represents 10%
      
      if (batteryLevel >= blockThreshold) {
        // Full block - bright white
        this.ctx.fillStyle = '#ffffff';
      } else if (batteryLevel > i * 10) {
        // Partial block - dimmed based on fill level
        const fillLevel = (batteryLevel - (i * 10)) / 10;
        const brightness = Math.floor(255 * fillLevel);
        this.ctx.fillStyle = `rgb(${brightness}, ${brightness}, ${brightness})`;
      } else {
        // Empty block - dark gray
        this.ctx.fillStyle = '#333333';
      }
      
      this.ctx.fillRect(blockX, y - 10, blockWidth, blockHeight);
    }
  }

  /**
   * Render a stat bar
   */
  renderStatBar(
    x: number,
    y: number,
    width: number,
    height: number,
    value: number,
    maxValue: number,
    color: string,
    label: string
  ): void {
    // Background bar
    this.ctx.fillStyle = '#34495e';
    this.ctx.fillRect(x, y, width, height);

    // Value bar
    const percentage = Math.max(0, Math.min(1, value / maxValue));
    const barWidth = width * percentage;
    
    this.ctx.fillStyle = color;
    this.ctx.fillRect(x, y, barWidth, height);

    // Border
    this.ctx.strokeStyle = '#2c3e50';
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(x, y, width, height);

    // Label and value
    this.ctx.fillStyle = '#ecf0f1';
    this.ctx.font = '12px Arial';
    this.ctx.textAlign = 'left';
    this.ctx.fillText(`${label}: ${Math.floor(value)}/${maxValue}`, x, y - 5);
  }

  /**
   * Render world bounds for debugging
   */
  renderWorldBounds(camera: Camera): void {
    if (!camera.worldBounds) return;
    
    // Transform world bounds to screen coordinates
    const topLeft = worldToScreen({ x: camera.worldBounds.minX, y: camera.worldBounds.minY }, camera);
    const bottomRight = worldToScreen({ x: camera.worldBounds.maxX, y: camera.worldBounds.maxY }, camera);
    
    // Draw world bounds border
    this.ctx.strokeStyle = '#e74c3c';
    this.ctx.lineWidth = 3 * camera.zoom;
    this.ctx.strokeRect(
      topLeft.x,
      topLeft.y,
      bottomRight.x - topLeft.x,
      bottomRight.y - topLeft.y
    );
  }

  /**
   * Render HUD text and bars
   */
  renderHUD(gameState: GameState, camera?: Camera, isMuted?: boolean, timeScale?: number, activeDrugs?: any[]): void {
    const canvasWidth = this.config.canvasWidth;
    const canvasHeight = this.config.canvasHeight;
    
    // Inventory panel in top left (moved down to avoid ESC text)
    this.renderInventoryPanel(10, 50, gameState.player.inventory);
    
    // Mute button in top left (moved down to avoid overlap with inventory)
    this.renderMuteButton(10, 300, isMuted || false);
    
    // Stats panel in top right (black background like in target image)
    const statsPanelX = canvasWidth - 200;
    const statsPanelY = 10;
    const statsPanelWidth = 180;
    const statsPanelHeight = 200;
    
    // Draw stats panel background
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    this.ctx.fillRect(statsPanelX, statsPanelY, statsPanelWidth, statsPanelHeight);
    this.ctx.strokeStyle = '#ecf0f1';
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(statsPanelX, statsPanelY, statsPanelWidth, statsPanelHeight);
    
    // Stat bars (like in target image)
    let barY = statsPanelY + 15;
    this.renderStatBar(statsPanelX + 10, barY, 150, 12, gameState.player.stats.thirst, 100, '#3498db', 'Thirst');
    barY += 18;
    this.renderStatBar(statsPanelX + 10, barY, 150, 12, gameState.player.stats.hunger, 100, '#e67e22', 'Hunger');
    barY += 18;
    this.renderStatBar(statsPanelX + 10, barY, 150, 12, gameState.player.stats.energy, 100, '#f1c40f', 'Energy');
    barY += 18;
    this.renderStatBar(statsPanelX + 10, barY, 150, 12, gameState.player.stats.mood, 100, '#9b59b6', 'Mood');
    
    // Light battery meter (10 rectangular blocks)
    barY += 18;
    this.renderLightBatteryMeter(statsPanelX + 10, barY, gameState.player.stats.lightBattery);
    
    // Number stats (no bars, just text like in target image)
    barY += 30;
    this.ctx.fillStyle = '#ecf0f1';
    this.ctx.font = '14px Arial';
    this.ctx.textAlign = 'left';
    this.ctx.fillText(`Coins: ${gameState.player.stats.coins}`, statsPanelX + 10, barY);
    barY += 18;
    this.ctx.fillText(`Karma: ${Math.round(gameState.player.stats.karma)}`, statsPanelX + 10, barY);
    barY += 18;
    // Calculate and display effective speed including drug effects and bike
    const drugSpeedMultiplier = this.calculateDrugSpeedMultiplier(gameState.player.drugs);
    const bikeMultiplier = (gameState.player.isOnBike || gameState.player.mountedOn) ? 1.5 : 1.0;
    const baseEffectiveSpeed = calculateEffectiveSpeed(gameState.player.stats.speed, gameState.player.stats);
    const effectiveSpeed = baseEffectiveSpeed * drugSpeedMultiplier * bikeMultiplier;
    this.ctx.fillText(`Speed: ${(effectiveSpeed / 100).toFixed(1)}x`, statsPanelX + 10, barY);
    barY += 18;
    if (timeScale !== undefined) {
      this.ctx.fillText(`Time: ${timeScale.toFixed(1)}x`, statsPanelX + 10, barY);
    }
    barY += 18;
    
    // Display game time
    this.ctx.fillText(`Game Time: ${formatGameTime(gameState.time)}`, statsPanelX + 10, barY);
    barY += 18;
    this.ctx.fillText(`Period: ${getTimeOfDayDescription(gameState.time)}`, statsPanelX + 10, barY);

    // Active drugs info (enhanced display below stats panel)
    if (activeDrugs && activeDrugs.length > 0) {
      barY += 25;
      
      // Drug status panel background
      const drugPanelY = barY;
      const drugPanelHeight = activeDrugs.length * 20 + 10;
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
      this.ctx.fillRect(statsPanelX, drugPanelY, statsPanelWidth, drugPanelHeight);
      this.ctx.strokeStyle = '#e74c3c';
      this.ctx.lineWidth = 2;
      this.ctx.strokeRect(statsPanelX, drugPanelY, statsPanelWidth, drugPanelHeight);
      
      // Drug effects header
      this.ctx.fillStyle = '#e74c3c';
      this.ctx.font = 'bold 12px Arial';
      this.ctx.textAlign = 'left';
      this.ctx.fillText('Active Effects:', statsPanelX + 10, drugPanelY + 15);
      
      // Sort drugs by remaining time (longest first)
      const sortedDrugs = [...activeDrugs].sort((a, b) => b.duration - a.duration);
      
      // Individual drug effects
      sortedDrugs.forEach((drug, index) => {
        const drugY = drugPanelY + 25 + (index * 18);
        
        // Format duration as seconds (since we're using 1 hour = 6 seconds scale)
        const totalSeconds = Math.ceil(drug.duration);
        const timeStr = `${totalSeconds}s`;
        
        // Get drug-specific emoji
        const emoji = this.getDrugEmoji(drug.type);
        
        // Capitalize drug name properly
        const capitalizedName = drug.type.charAt(0).toUpperCase() + drug.type.slice(1).replace('-', ' ');
        
        // Drug emoji, name and time
        this.ctx.fillStyle = '#f1c40f';
        this.ctx.font = '11px Arial';
        this.ctx.fillText(`${emoji} ${capitalizedName}: ${timeStr}`, statsPanelX + 10, drugY);
      });
    }
    
    // Camera debug info (bottom left)
    if (camera) {
      this.ctx.textAlign = 'left';
      this.ctx.fillText(`Camera: (${Math.floor(camera.position.x)}, ${Math.floor(camera.position.y)})`, 10, canvasHeight - 40);
      this.ctx.fillText(`Viewport: (${Math.floor(camera.viewport.x)}, ${Math.floor(camera.viewport.y)})`, 10, canvasHeight - 20);
    }
  }

  /**
   * Render inventory panel
   */
  renderInventoryPanel(x: number, y: number, inventory: any): void {
    const items = getInventoryItems(inventory);
    const panelHeight = 30 + (items.length * 25);
    
    // Clear previous item bounds
    this.inventoryItemBounds = [];
    
    // Draw solid inventory panel background
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    this.ctx.fillRect(x, y, 200, panelHeight);
    this.ctx.strokeStyle = '#8b5cf6';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(x, y, 200, panelHeight);
    
    // Draw title with backpack emoji
    this.ctx.fillStyle = '#8b5cf6';
    this.ctx.font = 'bold 14px Arial';
    this.ctx.textAlign = 'left';
    this.ctx.fillText('🎒 Inventory', x + 10, y + 20);
    
    // Draw items
    let itemY = y + 40;
    items.forEach(item => {
      // Store clickable bounds for this item
      this.inventoryItemBounds.push({
        x: x + 5,
        y: itemY - 15,
        width: 190,
        height: 20,
        itemType: item.type
      });
      
      // Solid item background
      this.ctx.fillStyle = 'rgba(139, 92, 246, 0.3)';
      this.ctx.fillRect(x + 5, itemY - 15, 190, 20);
      this.ctx.strokeStyle = '#a855f7';
      this.ctx.lineWidth = 1;
      this.ctx.strokeRect(x + 5, itemY - 15, 190, 20);
      
      // Get emoji for item
      const emoji = this.getItemEmoji(item.type);
      
      // Item emoji, name and hotkey
      this.ctx.fillStyle = '#ecf0f1';
      this.ctx.font = '12px Arial';
      this.ctx.textAlign = 'left';
      const displayText = item.hotkey ? `${emoji} [${item.hotkey}] ${item.type}` : `${emoji} ${item.type}`;
      this.ctx.fillText(displayText, x + 10, itemY - 2);
      
      // Quantity with solid background
      this.ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
      this.ctx.fillRect(x + 150, itemY - 12, 30, 14);
      this.ctx.strokeStyle = '#8b5cf6';
      this.ctx.lineWidth = 1;
      this.ctx.strokeRect(x + 150, itemY - 12, 30, 14);
      this.ctx.fillStyle = '#ecf0f1';
      this.ctx.font = '10px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(item.quantity.toString(), x + 165, itemY - 2);
      
      itemY += 25;
    });
  }

  /**
   * Get emoji for item type
   */
  private getItemEmoji(itemType: string): string {
    const emojiMap: Record<string, string> = {
      'Water': '💧',
      'Grilled Cheese': '🧀',
      'Energy Bar': '⚡',
      'Trinket': '✨',
      'Clothing': '👕',
      'Veggie Burger': '🍔',
      'Fruit Salad': '🥗',
      'Pizza Slice': '🍕',
      'Smoothie': '🥤',
      'Popsicle': '🍭',
      'Burrito': '🌯',
      'Taco': '🌮',
      'Ice Cream': '🍦',
      'Corn Dog': '🌭',
      'Funnel Cake': '🧁',
      'Nachos': '🌽',
      'Cotton Candy': '🍬',
      'Gas Can': '⛽',
      'Light Bulb': '💡',
      'Light Bulb White': '💡',
      'Light Bulb Red': '🔴',
      'Light Bulb Green': '🟢',
      'Light Bulb Blue': '🔵',
      'Light Bulb Orange': '🟠',
      'Light Bulb Purple': '🟣',
      'Light Bulb Rainbow': '🌈'
    };
    return emojiMap[itemType] || '📦';
  }

  /**
   * Render notifications in world space (like coins)
   */
  renderNotifications(camera: Camera): void {
    const notificationSystem = getNotificationSystem();
    const notifications = notificationSystem.notifications;
    
    // Sort notifications by timestamp (newest first for stacking)
    const sortedNotifications = [...notifications].sort((a, b) => b.timestamp - a.timestamp);
    
    sortedNotifications.forEach((notification, index) => {
      // Check if notification is visible in camera viewport
      if (!isWorldPositionVisible(notification.worldPosition, camera)) {
        return;
      }

      // Convert world position to screen position using camera
      const screenPos = worldToScreen(notification.worldPosition, camera);
      
      // Stack notifications vertically with better spacing
      const stackOffset = index * 30; // 30px spacing between stacked notifications
      const finalY = screenPos.y - stackOffset;
      
      // Get color based on type
      const color = this.getNotificationColor(notification.type, notification.value);
      
      // Draw text outline for better readability
      this.ctx.strokeStyle = `rgba(0, 0, 0, ${notification.alpha * 0.8})`;
      this.ctx.lineWidth = 2;
      this.ctx.font = 'bold 20px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      
      // Draw notification text with outline
      this.ctx.strokeText(notification.message, screenPos.x, finalY);
      this.ctx.fillStyle = `${color}${Math.floor(255 * notification.alpha).toString(16).padStart(2, '0')}`;
      this.ctx.fillText(notification.message, screenPos.x, finalY);
    });
  }

  /**
   * Render special effects for the Camp world
   */
  renderCampEffects(camera: Camera): void {
    // Draw grey dashed boundary line around the entire camp world perimeter
    this.ctx.strokeStyle = '#808080'; // Grey color
    this.ctx.lineWidth = 2;
    this.ctx.setLineDash([5, 5]); // Dashed line pattern
    
    // Camp world bounds (offset 50px from edges)
    const campWorldBounds = {
      x: 50, // 50px from left edge
      y: 50, // 50px from top edge
      width: 1500, // 1600 - 100 (50px on each side)
      height: 1100  // 1200 - 100 (50px on each side)
    };
    
    const topLeft = worldToScreen({ x: campWorldBounds.x, y: campWorldBounds.y }, camera);
    const bottomRight = worldToScreen({ x: campWorldBounds.x + campWorldBounds.width, y: campWorldBounds.y + campWorldBounds.height }, camera);
    
    this.ctx.strokeRect(topLeft.x, topLeft.y, bottomRight.x - topLeft.x, bottomRight.y - topLeft.y);
    
    // Reset line dash
    this.ctx.setLineDash([]);
    
    // Draw tents in the camp
    this.renderCampTents(camera);
    
    // Pulsating disco ball on top of our camp area on the playa
    const time = Date.now() * 0.001;
    const discoBallPos = { x: 1200, y: 1500 }; // Our camp position on the playa
    const screenPos = worldToScreen(discoBallPos, camera);
    
    if (isWorldPositionVisible(discoBallPos, camera, 50)) {
      // Pulsating scale effect
      const pulseScale = 1 + Math.sin(time * 3) * 0.3; // Pulse between 0.7 and 1.3
      const fontSize = 60 * pulseScale * camera.zoom;
      
      this.ctx.font = `${fontSize}px Arial`;
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText('🪩', screenPos.x, screenPos.y);
    }
  }

  /**
   * Render tents in the camp
   */
  renderCampTents(camera: Camera): void {
    const tentPositions = [
      { x: 200, y: 200 },
      { x: 400, y: 300 },
      { x: 600, y: 150 },
      { x: 800, y: 250 },
      { x: 1000, y: 180 },
      { x: 1200, y: 320 },
      { x: 1400, y: 200 },
      { x: 300, y: 500 },
      { x: 500, y: 600 },
      { x: 700, y: 550 },
      { x: 900, y: 650 },
      { x: 1100, y: 580 },
      { x: 1300, y: 620 }
    ];
    
    tentPositions.forEach(tentPos => {
      if (isWorldPositionVisible(tentPos, camera, 30)) {
        const screenPos = worldToScreen(tentPos, camera);
        const tentSize = 80 * camera.zoom; // 4x larger (20 * 4 = 80)
        
        // Draw tent emoji
        this.ctx.font = `${tentSize}px Arial`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('⛺', screenPos.x, screenPos.y);
      }
    });
  }

  /**
   * Render special effects for the Playa world
   */
  renderPlayaEffects(camera: Camera): void {
    
    // Draw tents scattered around the playa
    this.renderTents(camera);
    
    // Draw camp emojis scattered around the playa
    this.renderPlayaCamps(camera);
    
    // All text removed from playa
  }

  /**
   * Render tents scattered around the playa
   */
  renderTents(camera: Camera): void {
    const tentPositions = [
      { x: 400, y: 300 },
      { x: 1800, y: 400 },
      { x: 600, y: 1400 },
      { x: 2000, y: 1500 },
      { x: 300, y: 800 },
      { x: 2100, y: 1000 }
    ];
    
    tentPositions.forEach(tentPos => {
      if (isWorldPositionVisible(tentPos, camera, 30)) {
        const screenPos = worldToScreen(tentPos, camera);
        const tentSize = 20 * camera.zoom;
        
        // Draw tent emoji
        this.ctx.font = `${tentSize}px Arial`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('⛺', screenPos.x, screenPos.y);
      }
    });
  }

  /**
   * Render camp emojis scattered around the playa
   */
  renderPlayaCamps(camera: Camera): void {
    const campPositions = [
      { x: 300, y: 400 },
      { x: 1900, y: 500 },
      { x: 500, y: 1500 },
      { x: 2100, y: 1600 },
      { x: 400, y: 900 },
      { x: 2000, y: 1100 },
      { x: 1500, y: 300 },
      { x: 800, y: 1600 }
    ];
    
    campPositions.forEach(campPos => {
      if (isWorldPositionVisible(campPos, camera, 30)) {
        const screenPos = worldToScreen(campPos, camera);
        const campSize = 25 * camera.zoom;
        
        // Draw camp emoji
        this.ctx.font = `${campSize}px Arial`;
        this.ctx.textAlign = 'center';
        this.ctx.textBaseline = 'middle';
        this.ctx.fillText('🏕️', screenPos.x, screenPos.y);
      }
    });
  }

  /**
   * Render action panel in bottom left
   */
  renderActionPanel(isResting: boolean): void {
    const panelX = 10;
    const panelY = this.config.canvasHeight - 120;
    const panelWidth = 200;
    const panelHeight = 100;

    // Draw action panel background
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    this.ctx.fillRect(panelX, panelY, panelWidth, panelHeight);
    this.ctx.strokeStyle = '#ecf0f1';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(panelX, panelY, panelWidth, panelHeight);

    // Draw title
    this.ctx.fillStyle = '#ecf0f1';
    this.ctx.font = 'bold 14px Arial';
    this.ctx.textAlign = 'left';
    this.ctx.fillText('Actions', panelX + 10, panelY + 20);

    // Draw rest action
    const restY = panelY + 40;
    const restHeight = 30;
    
    // Rest action background
    this.ctx.fillStyle = isResting ? 'rgba(46, 204, 113, 0.3)' : 'rgba(52, 73, 94, 0.3)';
    this.ctx.fillRect(panelX + 10, restY, panelWidth - 20, restHeight);
    this.ctx.strokeStyle = isResting ? '#2ecc71' : '#34495e';
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(panelX + 10, restY, panelWidth - 20, restHeight);

    // Rest action text
    this.ctx.fillStyle = isResting ? '#2ecc71' : '#ecf0f1';
    this.ctx.font = '12px Arial';
    this.ctx.textAlign = 'left';
    this.ctx.fillText('Rest [R]', panelX + 15, restY + 20);

    // Rest status indicator
    if (isResting) {
      this.ctx.fillStyle = '#2ecc71';
      this.ctx.font = '10px Arial';
      this.ctx.textAlign = 'right';
      this.ctx.fillText('ACTIVE', panelX + panelWidth - 15, restY + 20);
    }
  }

  /**
   * Get color for notification type
   */
  private getNotificationColor(type: string, value: number): string {
    const isPositive = value > 0;
    
    switch (type) {
      case 'coin':
        return isPositive ? '#f1c40f' : '#e74c3c'; // Gold for positive, red for negative
      case 'thirst':
        return isPositive ? '#3498db' : '#e74c3c'; // Blue for positive, red for negative
      case 'hunger':
        return isPositive ? '#e67e22' : '#e74c3c'; // Orange for positive, red for negative
      case 'energy':
        return isPositive ? '#f1c40f' : '#e74c3c'; // Yellow for positive, red for negative
      case 'mood':
        return isPositive ? '#9b59b6' : '#e74c3c'; // Purple for positive, red for negative
      case 'karma':
        return isPositive ? '#27ae60' : '#e74c3c'; // Green for positive, red for negative
      case 'speed':
        return isPositive ? '#1abc9c' : '#e74c3c'; // Teal for positive, red for negative
      case 'item':
        return '#8b5cf6'; // Purple for items
      default:
        return isPositive ? '#27ae60' : '#e74c3c'; // Green for positive, red for negative
    }
  }

  /**
   * Render mute button
   */
  renderMuteButton(x: number, y: number, isMuted: boolean): void {
    const buttonSize = 30;
    
    // Store button bounds for click detection
    this.muteButtonBounds = { x, y, width: buttonSize, height: buttonSize + 20 };
    
    // Button background
    this.ctx.fillStyle = isMuted ? '#e74c3c' : '#27ae60';
    this.ctx.fillRect(x, y, buttonSize, buttonSize);
    
    // Button border
    this.ctx.strokeStyle = '#ecf0f1';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(x, y, buttonSize, buttonSize);
    
    // Mute icon
    this.ctx.fillStyle = '#ecf0f1';
    this.ctx.font = '16px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText(isMuted ? '🔇' : '🔊', x + buttonSize/2, y + buttonSize/2);
    
    // Label
    this.ctx.font = '12px Arial';
    this.ctx.fillText('M', x + buttonSize/2, y + buttonSize + 15);
  }

  /**
   * Render fire effects for burning structures
   */
  private renderFireEffects(screenPos: Vec2, size: number): void {
    const time = Date.now() * 0.001;
    
    // Draw multiple fire particles
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const distance = size * 0.8 + Math.sin(time * 3 + i) * size * 0.2;
      const fireX = screenPos.x + Math.cos(angle) * distance;
      const fireY = screenPos.y + Math.sin(angle) * distance - Math.sin(time * 5 + i) * 20;
      
      // Fire particle
      this.ctx.fillStyle = `hsl(${20 + Math.sin(time * 2 + i) * 20}, 100%, ${50 + Math.sin(time * 4 + i) * 30}%)`;
      this.ctx.beginPath();
      this.ctx.arc(fireX, fireY, 3 + Math.sin(time * 3 + i) * 2, 0, Math.PI * 2);
      this.ctx.fill();
    }
    
    // Draw fireworks for The Man burn
    if (Math.sin(time * 2) > 0.8) {
      for (let i = 0; i < 12; i++) {
        const angle = (i / 12) * Math.PI * 2;
        const distance = size * 2 + Math.sin(time * 4 + i) * size;
        const fireworkX = screenPos.x + Math.cos(angle) * distance;
        const fireworkY = screenPos.y + Math.sin(angle) * distance;
        
        this.ctx.fillStyle = `hsl(${i * 30}, 100%, 60%)`;
        this.ctx.beginPath();
        this.ctx.arc(fireworkX, fireworkY, 2, 0, Math.PI * 2);
        this.ctx.fill();
      }
    }
  }

  /**
   * Render The Man with detailed graphics and building progress
   */
  private renderTheMan(screenPos: Vec2, size: number, progress: number, _isBurning: boolean, handsUp: boolean): void {
    const x = screenPos.x;
    const y = screenPos.y;
    const baseSize = size;
    
    // Save context
    this.ctx.save();
    
    // Base platform (10%+)
    if (progress > 0.05) {
      this.ctx.fillStyle = '#8B4513'; // Brown wood
      // 50% smaller base relative to overall size
      this.ctx.fillRect(x - baseSize * 0.3, y + baseSize * 0.15, baseSize * 0.6, baseSize * 0.1);
      this.ctx.strokeRect(x - baseSize * 0.3, y + baseSize * 0.15, baseSize * 0.6, baseSize * 0.1);
      
      // Platform details adjusted to new width
      this.ctx.strokeStyle = '#654321';
      this.ctx.lineWidth = 2;
      for (let i = 0; i < 5; i++) {
        const boardX = x - baseSize * 0.25 + (i * baseSize * 0.125);
        this.ctx.beginPath();
        this.ctx.moveTo(boardX, y + baseSize * 0.15);
        this.ctx.lineTo(boardX, y + baseSize * 0.25);
        this.ctx.stroke();
      }
    }
    
    // Central pole (20%+)
    if (progress > 0.15) {
      const poleHeight = baseSize * 0.8 * Math.min((progress - 0.15) * 1.5, 1);
      this.ctx.fillStyle = '#654321'; // Darker brown
      this.ctx.fillRect(x - baseSize * 0.05, y + baseSize * 0.5 - poleHeight, baseSize * 0.1, poleHeight);
      this.ctx.strokeRect(x - baseSize * 0.05, y + baseSize * 0.5 - poleHeight, baseSize * 0.1, poleHeight);
      
      // Pole details (wood grain)
      this.ctx.strokeStyle = '#4A2C17';
      this.ctx.lineWidth = 1;
      for (let i = 0; i < Math.floor(poleHeight / 20); i++) {
        const grainY = y + baseSize * 0.5 - poleHeight + (i * 20);
        this.ctx.beginPath();
        this.ctx.moveTo(x - baseSize * 0.05, grainY);
        this.ctx.lineTo(x + baseSize * 0.05, grainY);
        this.ctx.stroke();
      }
    }
    
    // Man figure base (50%+)
    if (progress > 0.45) {
      const manScale = Math.min((progress - 0.45) * 2, 1);
      
      // Man's body (vertical rectangle with details)
      this.ctx.fillStyle = '#FF6B35'; // Orange
      this.ctx.fillRect(x - baseSize * 0.08 * manScale, y - baseSize * 0.3 * manScale, baseSize * 0.16 * manScale, baseSize * 0.4 * manScale);
      this.ctx.strokeRect(x - baseSize * 0.08 * manScale, y - baseSize * 0.3 * manScale, baseSize * 0.16 * manScale, baseSize * 0.4 * manScale);
      
      // Body details (wood planks)
      this.ctx.strokeStyle = '#E55A2B';
      this.ctx.lineWidth = 2;
      for (let i = 0; i < 4; i++) {
        const plankY = y - baseSize * 0.3 * manScale + (i * baseSize * 0.1 * manScale);
        this.ctx.beginPath();
        this.ctx.moveTo(x - baseSize * 0.08 * manScale, plankY);
        this.ctx.lineTo(x + baseSize * 0.08 * manScale, plankY);
        this.ctx.stroke();
      }
      
      // Man's head (circle with details)
      this.ctx.beginPath();
      this.ctx.arc(x, y - baseSize * 0.4 * manScale, baseSize * 0.08 * manScale, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.stroke();
      
      // Head details (face)
      this.ctx.fillStyle = '#000000';
      this.ctx.beginPath();
      this.ctx.arc(x - baseSize * 0.03 * manScale, y - baseSize * 0.42 * manScale, 2, 0, Math.PI * 2); // Left eye
      this.ctx.arc(x + baseSize * 0.03 * manScale, y - baseSize * 0.42 * manScale, 2, 0, Math.PI * 2); // Right eye
      this.ctx.fill();
      
      // Arms (horizontal lines with details)
      this.ctx.strokeStyle = '#FF6B35';
      this.ctx.lineWidth = 4;
      this.ctx.beginPath();
      
      if (handsUp) {
        // Arms raised up (Saturday)
        this.ctx.moveTo(x - baseSize * 0.08 * manScale, y - baseSize * 0.1 * manScale);
        this.ctx.lineTo(x - baseSize * 0.15 * manScale, y - baseSize * 0.25 * manScale);
        this.ctx.moveTo(x + baseSize * 0.08 * manScale, y - baseSize * 0.1 * manScale);
        this.ctx.lineTo(x + baseSize * 0.15 * manScale, y - baseSize * 0.25 * manScale);
      } else {
        // Arms horizontal (normal)
        this.ctx.moveTo(x - baseSize * 0.08 * manScale, y - baseSize * 0.1 * manScale);
        this.ctx.lineTo(x - baseSize * 0.25 * manScale, y - baseSize * 0.05 * manScale);
        this.ctx.moveTo(x + baseSize * 0.08 * manScale, y - baseSize * 0.1 * manScale);
        this.ctx.lineTo(x + baseSize * 0.25 * manScale, y - baseSize * 0.05 * manScale);
      }
      this.ctx.stroke();
      
      // Legs with details
      this.ctx.lineWidth = 4;
      this.ctx.beginPath();
      this.ctx.moveTo(x - baseSize * 0.05 * manScale, y + baseSize * 0.1 * manScale);
      this.ctx.lineTo(x - baseSize * 0.1 * manScale, y + baseSize * 0.3 * manScale);
      this.ctx.moveTo(x + baseSize * 0.05 * manScale, y + baseSize * 0.1 * manScale);
      this.ctx.lineTo(x + baseSize * 0.1 * manScale, y + baseSize * 0.3 * manScale);
      this.ctx.stroke();
    }
    
    // Additional details (70%+)
    if (progress > 0.65) {
      const detailScale = Math.min((progress - 0.65) * 3, 1);
      
      // Decorative elements
      this.ctx.fillStyle = '#FFD700'; // Gold
      this.ctx.beginPath();
      this.ctx.arc(x, y - baseSize * 0.5 * detailScale, baseSize * 0.02 * detailScale, 0, Math.PI * 2);
      this.ctx.fill();
    }
    
    // Final details (90%+)
    if (progress > 0.85) {
      const finalScale = Math.min((progress - 0.85) * 6, 1);
      
      // Base decorations
      this.ctx.fillStyle = '#FFD700';
      for (let i = 0; i < 8; i++) {
        const angle = (i / 8) * Math.PI * 2;
        const decorX = x + Math.cos(angle) * baseSize * 0.7 * finalScale;
        const decorY = y + baseSize * 0.3 + Math.sin(angle) * baseSize * 0.1 * finalScale;
        this.ctx.beginPath();
        this.ctx.arc(decorX, decorY, baseSize * 0.01 * finalScale, 0, Math.PI * 2);
        this.ctx.fill();
      }
    }
    
    // Percentage indicator
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.strokeStyle = '#000000';
    this.ctx.lineWidth = 3;
    this.ctx.font = 'bold 16px Arial';
    this.ctx.textAlign = 'center';
    const percentText = `${Math.round(progress * 100)}%`;
    this.ctx.strokeText(percentText, x, y - baseSize * 0.7);
    this.ctx.fillText(percentText, x, y - baseSize * 0.7);
    
    // Hands up indicator
    if (handsUp) {
      this.ctx.fillStyle = '#FF0000';
      this.ctx.font = 'bold 14px Arial';
      this.ctx.fillText('HANDS UP!', x, y - baseSize * 0.8);
    }
    
    // Restore context
    this.ctx.restore();
  }

  /**
   * Render The Temple with intricate detailed architecture and building progress
   */
  private renderTheTemple(screenPos: Vec2, size: number, progress: number, _isBurning: boolean): void {
    const x = screenPos.x;
    const y = screenPos.y;
    const baseSize = size;
    
    // Save context
    this.ctx.save();
    
    // Foundation and base platform (15%+)
    if (progress > 0.1) {
      this.ctx.fillStyle = '#8B4513'; // Brown wood
      this.ctx.fillRect(x - baseSize * 0.8, y + baseSize * 0.4, baseSize * 1.6, baseSize * 0.15);
      this.ctx.strokeRect(x - baseSize * 0.8, y + baseSize * 0.4, baseSize * 1.6, baseSize * 0.15);
      
      // Foundation details - stone blocks
      this.ctx.strokeStyle = '#654321';
      this.ctx.lineWidth = 1;
      for (let i = 0; i < 8; i++) {
        for (let j = 0; j < 3; j++) {
          const blockX = x - baseSize * 0.7 + (i * baseSize * 0.2);
          const blockY = y + baseSize * 0.4 + (j * baseSize * 0.05);
          this.ctx.strokeRect(blockX, blockY, baseSize * 0.18, baseSize * 0.04);
        }
      }
    }
    
    // Lower walls (35%+)
    if (progress > 0.2) {
      const wallHeight = baseSize * 0.3 * Math.min((progress - 0.2) * 2, 1);
      this.ctx.fillStyle = '#D2B48C'; // Tan
      this.ctx.fillRect(x - baseSize * 0.6, y + baseSize * 0.25 - wallHeight, baseSize * 1.2, wallHeight);
      this.ctx.strokeRect(x - baseSize * 0.6, y + baseSize * 0.25 - wallHeight, baseSize * 1.2, wallHeight);
      
      // Wall details - wooden planks
      this.ctx.strokeStyle = '#B8860B';
      this.ctx.lineWidth = 2;
      for (let i = 0; i < 6; i++) {
        const plankY = y + baseSize * 0.25 - wallHeight + (i * baseSize * 0.05);
        this.ctx.beginPath();
        this.ctx.moveTo(x - baseSize * 0.6, plankY);
        this.ctx.lineTo(x + baseSize * 0.6, plankY);
        this.ctx.stroke();
      }
      
      // Vertical supports
      for (let i = 0; i < 5; i++) {
        const supportX = x - baseSize * 0.5 + (i * baseSize * 0.25);
        this.ctx.beginPath();
        this.ctx.moveTo(supportX, y + baseSize * 0.25 - wallHeight);
        this.ctx.lineTo(supportX, y + baseSize * 0.25);
        this.ctx.stroke();
      }
    }
    
    // Temple entrance (55%+)
    if (progress > 0.4) {
      const entranceScale = Math.min((progress - 0.4) * 3, 1);
      this.ctx.fillStyle = '#000000';
      this.ctx.fillRect(x - baseSize * 0.15 * entranceScale, y + baseSize * 0.25 - baseSize * 0.3 * entranceScale, baseSize * 0.3 * entranceScale, baseSize * 0.2 * entranceScale);
      
      // Entrance arch
      this.ctx.strokeStyle = '#8B4513';
      this.ctx.lineWidth = 3;
      this.ctx.beginPath();
      this.ctx.arc(x, y + baseSize * 0.15 - baseSize * 0.3 * entranceScale, baseSize * 0.15 * entranceScale, 0, Math.PI);
      this.ctx.stroke();
    }
    
    // Upper walls (75%+)
    if (progress > 0.6) {
      const upperWallHeight = baseSize * 0.4 * Math.min((progress - 0.6) * 2.5, 1);
      this.ctx.fillStyle = '#F5DEB3'; // Wheat
      this.ctx.fillRect(x - baseSize * 0.5, y + baseSize * 0.25 - baseSize * 0.3 - upperWallHeight, baseSize * 1.0, upperWallHeight);
      this.ctx.strokeRect(x - baseSize * 0.5, y + baseSize * 0.25 - baseSize * 0.3 - upperWallHeight, baseSize * 1.0, upperWallHeight);
      
      // Upper wall details
      this.ctx.strokeStyle = '#D2B48C';
      this.ctx.lineWidth = 1;
      for (let i = 0; i < 5; i++) {
        const plankY = y + baseSize * 0.25 - baseSize * 0.3 - upperWallHeight + (i * baseSize * 0.08);
        this.ctx.beginPath();
        this.ctx.moveTo(x - baseSize * 0.5, plankY);
        this.ctx.lineTo(x + baseSize * 0.5, plankY);
        this.ctx.stroke();
      }
      
      // Windows
      for (let i = 0; i < 3; i++) {
        const windowX = x - baseSize * 0.3 + (i * baseSize * 0.3);
        const windowY = y + baseSize * 0.25 - baseSize * 0.3 - upperWallHeight * 0.5;
        this.ctx.fillStyle = '#87CEEB'; // Sky blue
        this.ctx.fillRect(windowX - baseSize * 0.05, windowY - baseSize * 0.08, baseSize * 0.1, baseSize * 0.16);
        this.ctx.strokeRect(windowX - baseSize * 0.05, windowY - baseSize * 0.08, baseSize * 0.1, baseSize * 0.16);
        
        // Window cross
        this.ctx.strokeStyle = '#8B4513';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(windowX, windowY - baseSize * 0.08);
        this.ctx.lineTo(windowX, windowY + baseSize * 0.08);
        this.ctx.moveTo(windowX - baseSize * 0.05, windowY);
        this.ctx.lineTo(windowX + baseSize * 0.05, windowY);
        this.ctx.stroke();
      }
    }
    
    // Temple roof (90%+)
    if (progress > 0.8) {
      const roofScale = Math.min((progress - 0.8) * 5, 1);
      this.ctx.fillStyle = '#8B4513'; // Brown
      this.ctx.beginPath();
      this.ctx.moveTo(x, y - baseSize * 0.4 * roofScale);
      this.ctx.lineTo(x - baseSize * 0.5, y + baseSize * 0.25 - baseSize * 0.3 - baseSize * 0.4 * roofScale);
      this.ctx.lineTo(x + baseSize * 0.5, y + baseSize * 0.25 - baseSize * 0.3 - baseSize * 0.4 * roofScale);
      this.ctx.closePath();
      this.ctx.fill();
      this.ctx.stroke();
      
      // Roof details - shingles
      this.ctx.strokeStyle = '#654321';
      this.ctx.lineWidth = 1;
      for (let i = 0; i < 8; i++) {
        const shingleY = y - baseSize * 0.4 * roofScale + (i * baseSize * 0.05 * roofScale);
        const shingleWidth = baseSize * 0.5 * (1 - (i / 8)) * roofScale;
        this.ctx.beginPath();
        this.ctx.moveTo(x - shingleWidth, shingleY);
        this.ctx.lineTo(x + shingleWidth, shingleY);
        this.ctx.stroke();
      }
    }
    
    // Temple spire and decorations (95%+)
    if (progress > 0.9) {
      const spireScale = Math.min((progress - 0.9) * 10, 1);
      
      // Main spire
      this.ctx.fillStyle = '#FFD700'; // Gold
      this.ctx.beginPath();
      this.ctx.moveTo(x, y - baseSize * 0.4);
      this.ctx.lineTo(x - baseSize * 0.08 * spireScale, y - baseSize * 0.7 * spireScale);
      this.ctx.lineTo(x + baseSize * 0.08 * spireScale, y - baseSize * 0.7 * spireScale);
      this.ctx.closePath();
      this.ctx.fill();
      this.ctx.stroke();
      
      // Spire details
      this.ctx.fillStyle = '#FFA500'; // Orange
      this.ctx.beginPath();
      this.ctx.arc(x, y - baseSize * 0.7 * spireScale, baseSize * 0.02 * spireScale, 0, Math.PI * 2);
      this.ctx.fill();
      
      // Corner spires
      for (let i = 0; i < 4; i++) {
        const angle = (i / 4) * Math.PI * 2;
        const cornerX = x + Math.cos(angle) * baseSize * 0.5;
        const cornerY = y + baseSize * 0.25 - baseSize * 0.3 - baseSize * 0.4 + Math.sin(angle) * baseSize * 0.1;
        
        this.ctx.fillStyle = '#FFD700';
        this.ctx.beginPath();
        this.ctx.moveTo(cornerX, cornerY);
        this.ctx.lineTo(cornerX - baseSize * 0.03 * spireScale, cornerY - baseSize * 0.15 * spireScale);
        this.ctx.lineTo(cornerX + baseSize * 0.03 * spireScale, cornerY - baseSize * 0.15 * spireScale);
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.stroke();
      }
    }
    
    // Final decorations (100%+)
    if (progress >= 1.0) {
      // Base decorations
      this.ctx.fillStyle = '#FFD700';
      for (let i = 0; i < 12; i++) {
        const angle = (i / 12) * Math.PI * 2;
        const decorX = x + Math.cos(angle) * baseSize * 0.8;
        const decorY = y + baseSize * 0.4 + Math.sin(angle) * baseSize * 0.1;
        this.ctx.beginPath();
        this.ctx.arc(decorX, decorY, baseSize * 0.015, 0, Math.PI * 2);
        this.ctx.fill();
      }
      
      // Prayer flags
      this.ctx.strokeStyle = '#FF0000';
      this.ctx.lineWidth = 2;
      for (let i = 0; i < 4; i++) {
        const angle = (i / 4) * Math.PI * 2;
        const flagX = x + Math.cos(angle) * baseSize * 0.6;
        const flagY = y + baseSize * 0.25 - baseSize * 0.3 - baseSize * 0.4;
        this.ctx.beginPath();
        this.ctx.moveTo(flagX, flagY);
        this.ctx.lineTo(flagX + Math.cos(angle) * baseSize * 0.2, flagY - baseSize * 0.1);
        this.ctx.stroke();
      }
    }
    
    // Percentage indicator
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.strokeStyle = '#000000';
    this.ctx.lineWidth = 3;
    this.ctx.font = 'bold 16px Arial';
    this.ctx.textAlign = 'center';
    const percentText = `${Math.round(progress * 100)}%`;
    this.ctx.strokeText(percentText, x, y - baseSize * 0.9);
    this.ctx.fillText(percentText, x, y - baseSize * 0.9);
    
    // Restore context
    this.ctx.restore();
  }

  /**
   * Render world landmarks
   */
  renderLandmarks(landmarks: Landmark[], camera: Camera): void {
    landmarks.forEach(landmark => {
      // For trash fence, check if any part of the large circle is visible
      if (landmark.type === 'trashFence') {
        if (!isWorldPositionVisible(landmark.position, camera, landmark.size)) {
          return;
        }
      } else {
        if (!isWorldPositionVisible(landmark.position, camera)) {
          return;
        }
      }

      const screenPos = worldToScreen(landmark.position, camera);
      
      this.ctx.fillStyle = landmark.color;
      this.ctx.strokeStyle = '#000000';
      this.ctx.lineWidth = 2;

      switch (landmark.type) {
        case 'man':
          // Draw The Man with building progress
          const manProgress = landmark.buildingProgress ?? 0;
          const manSize = landmark.size * Math.max(0.1, manProgress); // Minimum size to be visible
          
          if (landmark.isBurning) {
            // Draw fire effects
            this.renderFireEffects(screenPos, landmark.size);
          }
          
          if (manProgress > 0) {
            this.renderTheMan(screenPos, manSize, manProgress, landmark.isBurning || false, landmark.handsUp || false);
          }
          break;
          
        case 'temple':
          // Draw temple with building progress
          const templeProgress = landmark.buildingProgress ?? 0;
          const templeSize = landmark.size * Math.max(0.1, templeProgress); // Minimum size to be visible
          
          if (landmark.isBurning) {
            // Draw fire effects
            this.renderFireEffects(screenPos, landmark.size);
          }
          
          if (templeProgress > 0) {
            this.renderTheTemple(screenPos, templeSize, templeProgress, landmark.isBurning || false);
          }
          break;
          
        case 'trashFence':
          // Draw trash fence as orange posts with orange netting
          const posts = 48;
          const radius = landmark.size;
          // Netting (light orange translucent ring)
          this.ctx.save();
          this.ctx.beginPath();
          this.ctx.strokeStyle = 'rgba(255, 140, 0, 0.5)'; // orange netting
          this.ctx.lineWidth = 6;
          this.ctx.setLineDash([8, 6]);
          this.ctx.arc(screenPos.x, screenPos.y, radius, 0, Math.PI * 2);
          this.ctx.stroke();
          this.ctx.setLineDash([]);
          // Posts
          for (let i = 0; i < posts; i++) {
            const a = (i / posts) * Math.PI * 2;
            const px = screenPos.x + Math.cos(a) * radius;
            const py = screenPos.y + Math.sin(a) * radius;
            this.ctx.fillStyle = '#ff8c00'; // orange
            this.ctx.strokeStyle = '#cc6f00';
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.rect(px - 2, py - 10, 4, 20);
            this.ctx.fill();
            this.ctx.stroke();
          }
          this.ctx.restore();
          break;
          
        case 'camp':
          // Draw camp as a rectangle (for playa camp) or tent (for main camp)
          if (landmark.id === 'playa-camp') {
            // Draw playa camp with beige background and better styling
            const campWidth = 100;
            const campHeight = 75;
            const campX = screenPos.x - campWidth / 2;
            const campY = screenPos.y - campHeight / 2;
            
            // Draw beige background
            this.ctx.fillStyle = '#f5deb3'; // Beige color
            this.ctx.fillRect(campX, campY, campWidth, campHeight);
            
            // Draw grey dotted border
            this.ctx.strokeStyle = '#808080'; // Grey color
            this.ctx.lineWidth = 2;
            this.ctx.setLineDash([5, 5]); // Dashed line pattern
            this.ctx.strokeRect(campX, campY, campWidth, campHeight);
            
            // Reset line dash
            this.ctx.setLineDash([]);
            
            // Add "BOOM BOOM WOMB" text
            this.ctx.fillStyle = '#8b4513'; // Brown text
            this.ctx.font = 'bold 12px Arial';
            this.ctx.textAlign = 'center';
            this.ctx.textBaseline = 'middle';
            this.ctx.fillText('BOOM BOOM WOMB', screenPos.x, screenPos.y - 10);
            
            // Add camp emoji on top
            this.ctx.font = '20px Arial';
            this.ctx.fillText('🏕️', screenPos.x, screenPos.y + 10);
          } else {
            // Draw main camp as a tent
            this.ctx.beginPath();
            this.ctx.moveTo(screenPos.x, screenPos.y - landmark.size / 2);
            this.ctx.lineTo(screenPos.x - landmark.size / 2, screenPos.y + landmark.size / 2);
            this.ctx.lineTo(screenPos.x + landmark.size / 2, screenPos.y + landmark.size / 2);
            this.ctx.closePath();
            this.ctx.fill();
            this.ctx.stroke();
          }
          break;
          
        case 'artCar':
          // Draw art car as a rectangle
          this.ctx.fillRect(
            screenPos.x - landmark.size / 2,
            screenPos.y - landmark.size / 2,
            landmark.size,
            landmark.size
          );
          this.ctx.strokeRect(
            screenPos.x - landmark.size / 2,
            screenPos.y - landmark.size / 2,
            landmark.size,
            landmark.size
          );
          break;
      }
    });
  }

  /**
   * Render Hell Station and Art Cars
   */
  private renderHellStationAndArtCars(hellStation: any, gasCans: any[], artCars: any[], camera: Camera, playerPos: Vec2, visibilityRadius: number, mountedOn?: string): void {
    this.ctx.save();
    
    // Render Hell Station
    if (hellStation) {
      this.renderHellStation(hellStation, camera);
    }
    
    // Render gas cans (only if within visibility)
    this.ctx.font = '16px system-ui, Apple Color Emoji, Segoe UI Emoji, Noto Color Emoji';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    for (const can of gasCans) {
      if (!can.active && this.isWithinVisibility(can.pos, playerPos, visibilityRadius)) {
        const canScreenPos = worldToScreen(can.pos, camera);
        this.ctx.fillText('⛽', canScreenPos.x, canScreenPos.y);
      }
    }
    
    // Render art cars using the proper design system (only if within visibility or mounted)
    const visibleArtCars = artCars.filter(car => 
      this.isWithinVisibility(car.pos, playerPos, visibilityRadius) || 
      car.id === mountedOn
    );
    this.renderArtCarsWithDesigns(visibleArtCars, camera);
    
    // Add subtle glow to visible art cars
    this.renderArtCarGlow(visibleArtCars, camera);
    
    this.ctx.restore();
  }

  /**
   * Render art cars with their proper designs
   */
  private renderArtCarsWithDesigns(artCars: any[], camera: Camera): void {
    this.ctx.save();
    
    for (const car of artCars) {
      const carScreenPos = worldToScreen(car.pos, camera);
      const size = car.size;
      const width = 60 * size * camera.zoom;
      const height = 30 * size * camera.zoom;
      
      // Render fire effect for fire designs (behind the car)
      if (car.design === 'fire') {
        this.renderDragonBreathFire(carScreenPos, size * camera.zoom);
      } else if (car.design === 'octopus') {
        this.renderOctopusFireArms(carScreenPos, size * camera.zoom);
      }
      
      // Create car body with gradient and lighting
      this.renderCarBody(car, carScreenPos, width, height);
      
      // Add design-specific details and decorations
      this.renderDesignDetails(car, carScreenPos, width, height);
      
      // Add wheels with depth
      this.renderWheels(carScreenPos, width, height);
      
      // Add headlights with glow
      this.renderHeadlights(carScreenPos, width, height);
      
      // Add LED strips and neon effects
      this.renderNeonEffects(car, carScreenPos, width, height);
      
      // Add car name label
      this.renderCarLabel(car, carScreenPos, width, height);
      
      // Enhanced fuel bar with glow
      this.renderEnhancedFuelBar(car, carScreenPos, width, height);
    }
    
    this.ctx.restore();
  }

  private renderDragonBreathFire(pos: { x: number; y: number }, size: number): void {
    const time = Date.now() * 0.01;
    
    // Dragon breathes fire from its mouth (front of car)
    const mouthX = pos.x + 25 * size; // Front of dragon
    const mouthY = pos.y;
    
    // Create multiple flame streams
    for (let stream = 0; stream < 3; stream++) {
      const streamOffset = (stream - 1) * 8; // Spread flames
      const streamY = mouthY + streamOffset;
      
      // Create flame particles that shoot forward
      for (let i = 0; i < 5; i++) {
        const flameX = mouthX + i * 8 + Math.sin(time * 3 + i) * 3;
        const flameY = streamY + Math.sin(time * 2 + i) * 2;
        const flameSize = (5 - i) * size * 0.8; // Flames get smaller as they go out
        
        // Create flame gradient
        const gradient = this.ctx.createRadialGradient(flameX, flameY, 0, flameX, flameY, flameSize);
        gradient.addColorStop(0, '#ffff00');
        gradient.addColorStop(0.3, '#ff6600');
        gradient.addColorStop(0.6, '#ff3300');
        gradient.addColorStop(0.8, '#cc0000');
        gradient.addColorStop(1, '#660000');
        
        this.ctx.fillStyle = gradient;
        this.ctx.globalAlpha = 0.9 - i * 0.15;
        this.ctx.beginPath();
        this.ctx.arc(flameX, flameY, flameSize, 0, Math.PI * 2);
        this.ctx.fill();
      }
    }
    this.ctx.globalAlpha = 1;
  }

  private renderOctopusFireArms(pos: { x: number; y: number }, size: number): void {
    const time = Date.now() * 0.01;
    
    // Octopus tentacles with fire - 8 arms total
    for (let tentacle = 0; tentacle < 8; tentacle++) {
      const angle = (tentacle / 8) * Math.PI * 2;
      const baseX = pos.x + Math.cos(angle) * 20 * size;
      const baseY = pos.y + Math.sin(angle) * 20 * size;
      
      // Create fire along each tentacle
      for (let i = 0; i < 3; i++) {
        const flameX = baseX + Math.cos(angle) * i * 8 + Math.sin(time * 2 + tentacle) * 3;
        const flameY = baseY + Math.sin(angle) * i * 8 + Math.cos(time * 2 + tentacle) * 3;
        const flameSize = (3 - i) * size * 0.6;
        
        // Create flame gradient
        const gradient = this.ctx.createRadialGradient(flameX, flameY, 0, flameX, flameY, flameSize);
        gradient.addColorStop(0, '#ffff00');
        gradient.addColorStop(0.3, '#ff6600');
        gradient.addColorStop(0.6, '#ff3300');
        gradient.addColorStop(0.8, '#cc0000');
        gradient.addColorStop(1, '#660000');
        
        this.ctx.fillStyle = gradient;
        this.ctx.globalAlpha = 0.8 - i * 0.2;
        this.ctx.beginPath();
        this.ctx.arc(flameX, flameY, flameSize, 0, Math.PI * 2);
        this.ctx.fill();
      }
    }
    this.ctx.globalAlpha = 1;
  }

  private renderCarBody(car: any, pos: { x: number; y: number }, width: number, height: number): void {
    switch (car.design) {
      case 'classic':
        this.renderClassicCar(pos, width, height);
        break;
      case 'fire':
        this.renderDragonCar(pos, width, height);
        break;
      case 'speedy':
        this.renderSpeedyCar(pos, width, height);
        break;
      case 'heavy':
        this.renderHeavyCar(pos, width, height);
        break;
      case 'compact':
        this.renderCompactCar(pos, width, height);
        break;
      case 'alien':
        this.renderAlienCar(pos, width, height);
        break;
      case 'davinci':
        this.renderDaVinciCar(pos, width, height);
        break;
      case 'octopus':
        this.renderOctopusCar(pos, width, height);
        break;
    }
  }

  private renderClassicCar(pos: { x: number; y: number }, width: number, height: number): void {
    // Classic car with vintage styling
    const gradient = this.ctx.createLinearGradient(pos.x - width/2, pos.y - height/2, pos.x + width/2, pos.y + height/2);
    gradient.addColorStop(0, '#ffcc99'); // Cream highlight
    gradient.addColorStop(0.3, '#cc6600'); // Classic brown
    gradient.addColorStop(0.7, '#996600'); // Darker brown
    gradient.addColorStop(1, '#663300'); // Dark brown shadow
    
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(pos.x - width/2, pos.y - height/2, width, height);
    
    // Classic car roof
    this.ctx.fillStyle = '#8b4513';
    this.ctx.fillRect(pos.x - width/2 + 5, pos.y - height/2, width - 10, height * 0.4);
    
    // Chrome trim
    this.ctx.strokeStyle = '#cccccc';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(pos.x - width/2, pos.y - height/2, width, height);
    
    // Classic grille
    this.ctx.fillStyle = '#333333';
    this.ctx.fillRect(pos.x - width/4, pos.y + height/2 - 8, width/2, 6);
    for (let i = 0; i < 5; i++) {
      this.ctx.fillRect(pos.x - width/4 + i * width/10, pos.y + height/2 - 6, 2, 2);
    }
  }

  private renderDragonCar(pos: { x: number; y: number }, width: number, height: number): void {
    // Dragon body with scales
    const gradient = this.ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, width/2);
    gradient.addColorStop(0, '#ff6600'); // Bright orange center
    gradient.addColorStop(0.5, '#cc3300'); // Red-orange
    gradient.addColorStop(1, '#990000'); // Dark red edges
    
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(pos.x - width/2, pos.y - height/2, width, height);
    
    // Dragon scales
    this.ctx.fillStyle = '#ff3300';
    for (let i = 0; i < 3; i++) {
      for (let j = 0; j < 4; j++) {
        const scaleX = pos.x - width/2 + 10 + j * width/4;
        const scaleY = pos.y - height/2 + 5 + i * height/3;
        this.ctx.beginPath();
        this.ctx.arc(scaleX, scaleY, 4, 0, Math.PI * 2);
        this.ctx.fill();
      }
    }
    
    // Dragon head (front)
    this.ctx.fillStyle = '#ff4500';
    this.ctx.beginPath();
    this.ctx.ellipse(pos.x + width/2 - 5, pos.y, 8, height/2, 0, 0, Math.PI * 2);
    this.ctx.fill();
    
    // Dragon eyes
    this.ctx.fillStyle = '#ffff00';
    this.ctx.beginPath();
    this.ctx.arc(pos.x + width/2 - 2, pos.y - height/4, 2, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.beginPath();
    this.ctx.arc(pos.x + width/2 - 2, pos.y + height/4, 2, 0, Math.PI * 2);
    this.ctx.fill();
    
    // Dragon spikes on back
    this.ctx.fillStyle = '#cc0000';
    for (let i = 0; i < 3; i++) {
      const spikeX = pos.x - width/2 + 5 + i * width/3;
      this.ctx.beginPath();
      this.ctx.moveTo(spikeX, pos.y - height/2);
      this.ctx.lineTo(spikeX - 3, pos.y - height/2 - 8);
      this.ctx.lineTo(spikeX + 3, pos.y - height/2 - 8);
      this.ctx.closePath();
      this.ctx.fill();
    }
  }

  private renderSpeedyCar(pos: { x: number; y: number }, width: number, height: number): void {
    // Sleek racing car
    const gradient = this.ctx.createLinearGradient(pos.x - width/2, pos.y - height/2, pos.x + width/2, pos.y + height/2);
    gradient.addColorStop(0, '#66ff66'); // Bright green
    gradient.addColorStop(0.5, '#00cc00'); // Green
    gradient.addColorStop(1, '#006600'); // Dark green
    
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(pos.x - width/2, pos.y - height/2, width, height);
    
    // Racing spoiler
    this.ctx.fillStyle = '#004400';
    this.ctx.fillRect(pos.x - width/2 + 5, pos.y - height/2 - 5, width - 10, 5);
    
    // Air intakes
    this.ctx.fillStyle = '#333333';
    this.ctx.fillRect(pos.x - width/2 + 3, pos.y - height/4, 8, 4);
    this.ctx.fillRect(pos.x + width/2 - 11, pos.y - height/4, 8, 4);
    
    // Racing number
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 12px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('88', pos.x, pos.y + 2);
  }

  private renderHeavyCar(pos: { x: number; y: number }, width: number, height: number): void {
    // Armored tank-like vehicle
    const gradient = this.ctx.createLinearGradient(pos.x - width/2, pos.y - height/2, pos.x + width/2, pos.y + height/2);
    gradient.addColorStop(0, '#a0522d'); // Sandy brown
    gradient.addColorStop(0.5, '#8b4513'); // Saddle brown
    gradient.addColorStop(1, '#654321'); // Dark brown
    
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(pos.x - width/2, pos.y - height/2, width, height);
    
    // Armor plating
    this.ctx.fillStyle = '#555555';
    this.ctx.fillRect(pos.x - width/2, pos.y - height/2 - 4, width, 8);
    this.ctx.fillRect(pos.x - width/2, pos.y + height/2 - 4, width, 8);
    this.ctx.fillRect(pos.x - width/2 - 4, pos.y - height/2, 8, height);
    this.ctx.fillRect(pos.x + width/2 - 4, pos.y - height/2, 8, height);
    
    // Rivets
    this.ctx.fillStyle = '#888888';
    for (let i = 0; i < 6; i++) {
      for (let j = 0; j < 4; j++) {
        const rivetX = pos.x - width/2 + 5 + i * width/6;
        const rivetY = pos.y - height/2 + 5 + j * height/4;
        this.ctx.beginPath();
        this.ctx.arc(rivetX, rivetY, 1.5, 0, Math.PI * 2);
        this.ctx.fill();
      }
    }
    
    // Tank cannon
    this.ctx.fillStyle = '#333333';
    this.ctx.fillRect(pos.x + width/2 - 2, pos.y - 2, 15, 4);
  }

  private renderCompactCar(pos: { x: number; y: number }, width: number, height: number): void {
    // Small, cute car
    const gradient = this.ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, width/2);
    gradient.addColorStop(0, '#ffb3e6'); // Light pink
    gradient.addColorStop(0.7, '#ff69b4'); // Hot pink
    gradient.addColorStop(1, '#ff1493'); // Deep pink
    
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(pos.x - width/2, pos.y - height/2, width, height);
    
    // Cute rounded roof
    this.ctx.fillStyle = '#ff1493';
    this.ctx.beginPath();
    this.ctx.ellipse(pos.x, pos.y - height/4, width/2, height/3, 0, 0, Math.PI * 2);
    this.ctx.fill();
    
    // Cute headlights (big and round)
    this.ctx.fillStyle = '#ffff88';
    this.ctx.beginPath();
    this.ctx.arc(pos.x - width/3, pos.y - height/4, 4, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.beginPath();
    this.ctx.arc(pos.x + width/3, pos.y - height/4, 4, 0, Math.PI * 2);
    this.ctx.fill();
    
    // Cute smile
    this.ctx.strokeStyle = '#ff1493';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.arc(pos.x, pos.y + height/4, 6, 0, Math.PI);
    this.ctx.stroke();
  }

  private renderAlienCar(pos: { x: number; y: number }, width: number, height: number): void {
    // Alien spaceship with metallic look
    const gradient = this.ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, width/2);
    gradient.addColorStop(0, '#00ff88'); // Bright green center
    gradient.addColorStop(0.5, '#00cc66'); // Green
    gradient.addColorStop(1, '#006644'); // Dark green edges
    
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(pos.x - width/2, pos.y - height/2, width, height);
    
    // Alien dome (cockpit)
    this.ctx.fillStyle = '#88ff88';
    this.ctx.beginPath();
    this.ctx.ellipse(pos.x, pos.y - height/4, width/3, height/4, 0, 0, Math.PI * 2);
    this.ctx.fill();
    
    // Alien lights
    this.ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 3; i++) {
      this.ctx.beginPath();
      this.ctx.arc(pos.x - width/3 + i * width/3, pos.y + height/3, 3, 0, Math.PI * 2);
      this.ctx.fill();
    }
    
    // Antenna
    this.ctx.strokeStyle = '#00ff88';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(pos.x, pos.y - height/2);
    this.ctx.lineTo(pos.x, pos.y - height/2 - 10);
    this.ctx.stroke();
    
    // Antenna ball
    this.ctx.fillStyle = '#ff0088';
    this.ctx.beginPath();
    this.ctx.arc(pos.x, pos.y - height/2 - 10, 3, 0, Math.PI * 2);
    this.ctx.fill();
  }

  private renderDaVinciCar(pos: { x: number; y: number }, width: number, height: number): void {
    // Da Vinci tank with wooden construction
    const gradient = this.ctx.createLinearGradient(pos.x - width/2, pos.y - height/2, pos.x + width/2, pos.y + height/2);
    gradient.addColorStop(0, '#deb887'); // Burlywood
    gradient.addColorStop(0.5, '#8b7355'); // Dark khaki
    gradient.addColorStop(1, '#654321'); // Dark brown
    
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(pos.x - width/2, pos.y - height/2, width, height);
    
    // Wooden slats
    this.ctx.strokeStyle = '#654321';
    this.ctx.lineWidth = 2;
    for (let i = 0; i < 4; i++) {
      const y = pos.y - height/2 + i * height/4;
      this.ctx.beginPath();
      this.ctx.moveTo(pos.x - width/2, y);
      this.ctx.lineTo(pos.x + width/2, y);
      this.ctx.stroke();
    }
    
    // Central cannon
    this.ctx.fillStyle = '#333333';
    this.ctx.fillRect(pos.x - 2, pos.y - height/2 - 8, 4, 16);
    
    // Cannon balls around the edge
    this.ctx.fillStyle = '#666666';
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const ballX = pos.x + Math.cos(angle) * (width/2 + 5);
      const ballY = pos.y + Math.sin(angle) * (height/2 + 5);
      this.ctx.beginPath();
      this.ctx.arc(ballX, ballY, 3, 0, Math.PI * 2);
      this.ctx.fill();
    }
    
    // Renaissance-style decorations
    this.ctx.strokeStyle = '#8b4513';
    this.ctx.lineWidth = 1;
    this.ctx.beginPath();
    this.ctx.arc(pos.x, pos.y, width/3, 0, Math.PI * 2);
    this.ctx.stroke();
  }

  private renderOctopusCar(pos: { x: number; y: number }, width: number, height: number): void {
    // Octopus body
    const gradient = this.ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, width/2);
    gradient.addColorStop(0, '#ff6600'); // Orange center
    gradient.addColorStop(0.7, '#cc3300'); // Red-orange
    gradient.addColorStop(1, '#990000'); // Dark red edges
    
    this.ctx.fillStyle = gradient;
    this.ctx.beginPath();
    this.ctx.ellipse(pos.x, pos.y, width/2, height/2, 0, 0, Math.PI * 2);
    this.ctx.fill();
    
    // Octopus eyes
    this.ctx.fillStyle = '#ffffff';
    this.ctx.beginPath();
    this.ctx.arc(pos.x - width/6, pos.y - height/6, 4, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.beginPath();
    this.ctx.arc(pos.x + width/6, pos.y - height/6, 4, 0, Math.PI * 2);
    this.ctx.fill();
    
    // Eye pupils
    this.ctx.fillStyle = '#000000';
    this.ctx.beginPath();
    this.ctx.arc(pos.x - width/6, pos.y - height/6, 2, 0, Math.PI * 2);
    this.ctx.fill();
    this.ctx.beginPath();
    this.ctx.arc(pos.x + width/6, pos.y - height/6, 2, 0, Math.PI * 2);
    this.ctx.fill();
    
    // Octopus tentacles (will be rendered with fire effects)
    this.ctx.fillStyle = '#cc3300';
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const tentacleX = pos.x + Math.cos(angle) * width/2;
      const tentacleY = pos.y + Math.sin(angle) * height/2;
      this.ctx.beginPath();
      this.ctx.arc(tentacleX, tentacleY, 6, 0, Math.PI * 2);
      this.ctx.fill();
    }
  }

  private renderWheels(pos: { x: number; y: number }, width: number, height: number): void {
    const wheelSize = Math.min(width, height) * 0.15;
    const wheelY = pos.y + height/2 - wheelSize/2;
    
    // Front wheels
    this.renderWheel(pos.x - width/3, wheelY, wheelSize);
    this.renderWheel(pos.x + width/3, wheelY, wheelSize);
  }

  private renderWheel(centerX: number, centerY: number, size: number): void {
    // Wheel shadow
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
    this.ctx.beginPath();
    this.ctx.arc(centerX + 1, centerY + 1, size, 0, Math.PI * 2);
    this.ctx.fill();
    
    // Wheel body
    const wheelGradient = this.ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, size);
    wheelGradient.addColorStop(0, '#666666');
    wheelGradient.addColorStop(0.7, '#333333');
    wheelGradient.addColorStop(1, '#111111');
    
    this.ctx.fillStyle = wheelGradient;
    this.ctx.beginPath();
    this.ctx.arc(centerX, centerY, size, 0, Math.PI * 2);
    this.ctx.fill();
    
    // Wheel rim
    this.ctx.strokeStyle = '#cccccc';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.arc(centerX, centerY, size * 0.7, 0, Math.PI * 2);
    this.ctx.stroke();
  }

  private renderHeadlights(pos: { x: number; y: number }, width: number, height: number): void {
    const lightSize = Math.min(width, height) * 0.1;
    
    // Left headlight
    this.renderGlowingLight(pos.x - width/2 + lightSize, pos.y - height/4, lightSize, '#ffff88');
    // Right headlight
    this.renderGlowingLight(pos.x + width/2 - lightSize, pos.y - height/4, lightSize, '#ffff88');
  }

  private renderGlowingLight(centerX: number, centerY: number, size: number, color: string): void {
    // Outer glow
    const glowGradient = this.ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, size * 3);
    glowGradient.addColorStop(0, color);
    glowGradient.addColorStop(0.3, color + '80');
    glowGradient.addColorStop(1, color + '00');
    
    this.ctx.fillStyle = glowGradient;
    this.ctx.beginPath();
    this.ctx.arc(centerX, centerY, size * 3, 0, Math.PI * 2);
    this.ctx.fill();
    
    // Inner light
    this.ctx.fillStyle = color;
    this.ctx.beginPath();
    this.ctx.arc(centerX, centerY, size, 0, Math.PI * 2);
    this.ctx.fill();
  }

  private renderNeonEffects(car: any, pos: { x: number; y: number }, width: number, height: number): void {
    const time = Date.now() * 0.005;
    
    // LED strips
    const colors = ['#ff00ff', '#00ffff', '#ffff00', '#ff6600'];
    const color = colors[Math.floor(time) % colors.length];
    
    // Top LED strip
    this.renderGlowingLine(pos.x - width/2, pos.y - height/2 - 2, pos.x + width/2, pos.y - height/2 - 2, color, 3);
    // Bottom LED strip
    this.renderGlowingLine(pos.x - width/2, pos.y + height/2 + 2, pos.x + width/2, pos.y + height/2 + 2, color, 3);
  }

  private renderGlowingLine(x1: number, y1: number, x2: number, y2: number, color: string, width: number): void {
    // Glow effect
    this.ctx.strokeStyle = color + '40';
    this.ctx.lineWidth = width * 3;
    this.ctx.beginPath();
    this.ctx.moveTo(x1, y1);
    this.ctx.lineTo(x2, y2);
    this.ctx.stroke();
    
    // Main line
    this.ctx.strokeStyle = color;
    this.ctx.lineWidth = width;
    this.ctx.beginPath();
    this.ctx.moveTo(x1, y1);
    this.ctx.lineTo(x2, y2);
    this.ctx.stroke();
  }

  private renderCarLabel(car: any, pos: { x: number; y: number }, width: number, height: number): void {
    const labels = {
      'classic': 'CLASSIC',
      'fire': 'FIRE DRAGON',
      'speedy': 'SPEED DEMON',
      'heavy': 'TANK',
      'compact': 'MINI',
      'alien': 'UFO',
      'davinci': 'DA VINCI',
      'octopus': 'FIRE OCTOPUS'
    };
    
    const label = labels[car.design] || 'ART CAR';
    
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
    this.ctx.fillRect(pos.x - width/2, pos.y + height/2 + 5, width, 16);
    
    this.ctx.fillStyle = '#ffffff';
    this.ctx.font = 'bold 10px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(label, pos.x, pos.y + height/2 + 15);
  }

  private renderEnhancedFuelBar(car: any, pos: { x: number; y: number }, width: number, height: number): void {
    const barWidth = width * 0.8;
    const barHeight = 6;
    const pct = car.fuelMax > 0 ? car.fuel / car.fuelMax : 0;
    
    // Background
    this.ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
    this.ctx.fillRect(pos.x - barWidth/2, pos.y - height/2 - 15, barWidth, barHeight);
    
    // Fuel level with gradient
    const fuelGradient = this.ctx.createLinearGradient(pos.x - barWidth/2, 0, pos.x + barWidth/2, 0);
    if (pct < 0.25) {
      fuelGradient.addColorStop(0, '#ff0000');
      fuelGradient.addColorStop(1, '#ff6600');
    } else if (pct < 0.5) {
      fuelGradient.addColorStop(0, '#ffaa00');
      fuelGradient.addColorStop(1, '#ffff00');
    } else {
      fuelGradient.addColorStop(0, '#00ff00');
      fuelGradient.addColorStop(1, '#66ff66');
    }
    
    this.ctx.fillStyle = fuelGradient;
    this.ctx.fillRect(pos.x - barWidth/2, pos.y - height/2 - 15, barWidth * pct, barHeight);
    
    // Glow effect
    this.ctx.shadowColor = fuelGradient;
    this.ctx.shadowBlur = 4;
    this.ctx.fillRect(pos.x - barWidth/2, pos.y - height/2 - 15, barWidth * pct, barHeight);
    this.ctx.shadowBlur = 0;
  }

  private lightenColor(color: string, percent: number): string {
    const num = parseInt(color.replace("#", ""), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = (num >> 8 & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;
    return "#" + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
      (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
      (B < 255 ? B < 1 ? 0 : B : 255)).toString(16).slice(1);
  }

  private darkenColor(color: string, percent: number): string {
    const num = parseInt(color.replace("#", ""), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) - amt;
    const G = (num >> 8 & 0x00FF) - amt;
    const B = (num & 0x0000FF) - amt;
    return "#" + (0x1000000 + (R > 255 ? 255 : R < 0 ? 0 : R) * 0x10000 +
      (G > 255 ? 255 : G < 0 ? 0 : G) * 0x100 +
      (B > 255 ? 255 : B < 0 ? 0 : B)).toString(16).slice(1);
  }

  private renderDesignDetails(car: any, pos: { x: number; y: number }, width: number, height: number): void {
    switch (car.design) {
      case 'speedy':
        // Racing stripes with glow
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = 3;
        this.ctx.shadowColor = '#ffffff';
        this.ctx.shadowBlur = 2;
        this.ctx.beginPath();
        this.ctx.moveTo(pos.x - width/2 + 5, pos.y - height/4);
        this.ctx.lineTo(pos.x + width/2 - 5, pos.y - height/4);
        this.ctx.moveTo(pos.x - width/2 + 5, pos.y + height/4);
        this.ctx.lineTo(pos.x + width/2 - 5, pos.y + height/4);
        this.ctx.stroke();
        this.ctx.shadowBlur = 0;
        break;
      case 'heavy':
        // Additional tank details (rivets already in main body)
        // Tank tracks
        this.ctx.fillStyle = '#333333';
        this.ctx.fillRect(pos.x - width/2 - 2, pos.y - height/2 + 2, 4, height - 4);
        this.ctx.fillRect(pos.x + width/2 - 2, pos.y - height/2 + 2, 4, height - 4);
        break;
      case 'compact':
        // Cute accessories
        this.ctx.fillStyle = '#ffffff';
        this.ctx.shadowColor = '#ffffff';
        this.ctx.shadowBlur = 3;
        // Cute antenna
        this.ctx.beginPath();
        this.ctx.moveTo(pos.x, pos.y - height/2);
        this.ctx.lineTo(pos.x, pos.y - height/2 - 8);
        this.ctx.stroke();
        this.ctx.beginPath();
        this.ctx.arc(pos.x, pos.y - height/2 - 8, 2, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.shadowBlur = 0;
        break;
      case 'fire':
        // Dragon details (scales and spikes already in main body)
        // Dragon wings
        this.ctx.fillStyle = '#cc0000';
        this.ctx.beginPath();
        this.ctx.moveTo(pos.x - width/4, pos.y - height/2);
        this.ctx.lineTo(pos.x - width/2 - 5, pos.y - height/2 - 5);
        this.ctx.lineTo(pos.x - width/4, pos.y - height/2 + 5);
        this.ctx.closePath();
        this.ctx.fill();
        
        this.ctx.beginPath();
        this.ctx.moveTo(pos.x + width/4, pos.y - height/2);
        this.ctx.lineTo(pos.x + width/2 + 5, pos.y - height/2 - 5);
        this.ctx.lineTo(pos.x + width/4, pos.y - height/2 + 5);
        this.ctx.closePath();
        this.ctx.fill();
        break;
      case 'alien':
        // Alien technology details
        this.ctx.strokeStyle = '#00ff88';
        this.ctx.lineWidth = 1;
        this.ctx.shadowColor = '#00ff88';
        this.ctx.shadowBlur = 2;
        // Circuit patterns
        this.ctx.beginPath();
        this.ctx.moveTo(pos.x - width/3, pos.y + height/3);
        this.ctx.lineTo(pos.x + width/3, pos.y + height/3);
        this.ctx.moveTo(pos.x - width/3, pos.y - height/3);
        this.ctx.lineTo(pos.x + width/3, pos.y - height/3);
        this.ctx.stroke();
        this.ctx.shadowBlur = 0;
        break;
      case 'davinci':
        // Renaissance details (cannon balls already in main body)
        // Gear mechanisms
        this.ctx.strokeStyle = '#8b4513';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.ctx.arc(pos.x - width/4, pos.y + height/4, 4, 0, Math.PI * 2);
        this.ctx.stroke();
        this.ctx.beginPath();
        this.ctx.arc(pos.x + width/4, pos.y + height/4, 4, 0, Math.PI * 2);
        this.ctx.stroke();
        break;
      case 'octopus':
        // Octopus details (tentacles already in main body)
        // Suckers on tentacles - 8 arms
        this.ctx.fillStyle = '#ff3300';
        for (let i = 0; i < 8; i++) {
          const angle = (i / 8) * Math.PI * 2;
          const suckerX = pos.x + Math.cos(angle) * width/2;
          const suckerY = pos.y + Math.sin(angle) * height/2;
          this.ctx.beginPath();
          this.ctx.arc(suckerX, suckerY, 2, 0, Math.PI * 2);
          this.ctx.fill();
        }
        break;
    }
  }

  /**
   * Check if an object is within visibility range of the player
   */
  private isWithinVisibility(objectPos: Vec2, playerPos: Vec2, visibilityRadius: number): boolean {
    const dx = objectPos.x - playerPos.x;
    const dy = objectPos.y - playerPos.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance <= visibilityRadius;
  }

  /**
   * Get visibility radius based on current conditions
   */
  private getVisibilityRadius(gameState: GameState): number {
    const isNight = isNightTime(gameState.time);
    const hasDustStorm = gameState.dustStorm && gameState.dustStorm.active;
    const isMountedOnArtCar = gameState.player.mountedOn !== null;
    const weather = gameState.weather;
    
    let baseRadius: number;
    
    if (hasDustStorm) {
      // Very limited visibility during dust storm
      baseRadius = 80 - (gameState.dustStorm.intensity * 40); // 40-80px
    } else if (isNight) {
      // Limited visibility at night
      baseRadius = 200; // Limited night visibility
    } else {
      // Moderate visibility during day - still limited to create exploration challenge
      baseRadius = 300; // Moderate daytime visibility radius
    }
    
    // Apply weather effects
    if (weather.type === 'thunderstorm') {
      // Thunderstorms severely reduce visibility
      baseRadius *= (0.3 + (1 - weather.intensity) * 0.2); // 30-50% of normal visibility
    } else if (weather.type === 'nice') {
      // Nice weather improves visibility
      baseRadius *= (1.2 + weather.intensity * 0.3); // 120-150% of normal visibility
    } else if (weather.type === 'overcast') {
      // Overcast weather slightly reduces visibility
      baseRadius *= (0.8 + (1 - weather.intensity) * 0.2); // 80-100% of normal visibility
    }
    
    // Light battery visibility boost (based on battery percentage)
    // Only apply if lights are turned on
    const lightBattery = gameState.player.stats.lightBattery;
    if (lightBattery > 0 && gameState.player.lightsOn) {
      const isResting = gameState.player.isResting;
      // Scale boost based on battery level (0-100%)
      const batteryMultiplier = lightBattery / 100; // 0.0 to 1.0
      const boost = isResting ? (0.5 * batteryMultiplier) : (1.0 * batteryMultiplier); // 50-100% boost
      baseRadius *= (1 + boost);
    }
    
    // 3x visibility when mounted on art car
    if (isMountedOnArtCar) {
      return baseRadius * 3;
    }
    
    return baseRadius;
  }

  /**
   * Render the complete game state with spatial culling and camera
   */
  render(gameState: GameState, camera: Camera, spatialIndex?: SpatialIndex, backgroundColor?: string, landmarks?: Landmark[], _isMuted?: boolean, _timeScale?: number, _activeDrugs?: any[], currentWorldId?: string, collectibles?: any[], moop?: MoopItem[]): void {
    this.clear(backgroundColor);
    
    // Render special world effects
    if (currentWorldId === 'playa') {
      this.renderPlayaEffects(camera);
    } else if (currentWorldId === 'camp') {
      this.renderCampEffects(camera);
    }
    
    // Render landmarks first (background elements)
    if (landmarks) {
      this.renderLandmarks(landmarks, camera);
    }
    
    // Get visibility radius for fog of war
    const visibilityRadius = this.getVisibilityRadius(gameState);
    
    // Render lighting and visibility effects (between background and objects)
    this.renderLightingEffects(gameState, camera);
    
    // Render Hell Station and Art Cars (only on Playa)
    if (currentWorldId === 'playa' && gameState.hellStation && gameState.gasCans && gameState.artCars) {
      this.renderHellStationAndArtCars(gameState.hellStation, gameState.gasCans, gameState.artCars, camera, gameState.player.position, visibilityRadius, gameState.player.mountedOn);
    }
    
    // Render fog of war for both day and night (after lighting effects)
    this.renderFogOfWar(gameState, camera);
    
    // Render weather effects (rain, lightning, etc.)
    this.renderWeatherEffects(gameState, camera);
    
    // Render coins first (so player appears on top)
    if (spatialIndex) {
      // Use spatial culling with camera viewport
      const visibleWorldBounds = {
        minX: camera.viewport.x,
        minY: camera.viewport.y,
        maxX: camera.viewport.x + camera.viewport.width,
        maxY: camera.viewport.y + camera.viewport.height,
      };
      
      const visibleEntities = queryRect(
        spatialIndex,
        visibleWorldBounds.minX,
        visibleWorldBounds.minY,
        visibleWorldBounds.maxX,
        visibleWorldBounds.maxY
      );
      
      visibleEntities.entities.forEach((entity) => {
        const coin = gameState.coins.find(c => c.id === entity.id);
        if (coin && !coin.collected && this.isWithinVisibility(coin.position, gameState.player.position, visibilityRadius)) {
          this.renderCoin(coin.position, coin.value, camera);
        }
      });
    } else {
      // Fallback to rendering all coins with camera culling
      gameState.coins.forEach((coin) => {
        if (!coin.collected && this.isWithinVisibility(coin.position, gameState.player.position, visibilityRadius)) {
          this.renderCoin(coin.position, coin.value, camera);
        }
      });
    }
    
    // Render collectibles (water, food, drugs)
    if (collectibles) {
      collectibles.forEach((collectible) => {
        if (!collectible.collected && this.isWithinVisibility(collectible.position, gameState.player.position, visibilityRadius)) {
          this.renderCollectible(collectible.position, collectible.type, collectible.data?.subtype, camera, collectible.id);
        }
      });
    }
    
    // Render moop items
    if (moop) {
      let renderedMoopCount = 0;
      moop.forEach((moopItem) => {
        if (!moopItem.collected && this.isWithinVisibility(moopItem.position, gameState.player.position, visibilityRadius)) {
          this.renderMoop(moopItem, camera);
          renderedMoopCount++;
        }
      });
      if (renderedMoopCount > 0) {
        console.log(`Rendered ${renderedMoopCount} moop items`);
      }
    }
    
        // Render player
        this.renderPlayer(gameState.player.position, camera, gameState.player.isResting, gameState.player.stats.mood, !!gameState.player.mountedOn);
        
        // Render mounted art car on top of everything if player is mounted
        if (gameState.player.mountedOn && gameState.artCars) {
          const mountedCar = gameState.artCars.find(car => car.id === gameState.player.mountedOn);
          if (mountedCar) {
            this.renderMountedArtCarOnTop(mountedCar, camera);
          }
        }
        
        // Render colored light bulb effects if player has them and lights are on (white bulbs don't create visual auras)
        if (gameState.player.lightsOn) {
          const coloredLightBulbTypes = [
            'Light Bulb Red', 'Light Bulb Green', 'Light Bulb Blue', 
            'Light Bulb Orange', 'Light Bulb Purple', 'Light Bulb Rainbow',
            // Fallback for lowercase versions
            'Light Bulb red', 'Light Bulb green', 'Light Bulb blue',
            'Light Bulb orange', 'Light Bulb purple', 'Light Bulb rainbow'
          ];
          
          let hasAnyColoredLightBulbs = false;
          for (const bulbType of coloredLightBulbTypes) {
            const count = gameState.player.inventory.items.get(bulbType) || 0;
            if (count > 0) {
              hasAnyColoredLightBulbs = true;
              break;
            }
          }
          if (hasAnyColoredLightBulbs) {
            this.renderPlayerColoredLightEffects(gameState.player.position, camera, gameState.player.inventory, gameState.player.isResting);
          }
        }
        
        // Render drug effects
        this.renderDrugEffects(gameState.player.position, camera, gameState.player.drugs, gameState.time);
        
        // No need for fog of war overlay - we're using true fog of war by culling objects

        // HUD and action panel are now handled by HTML panels

        // Render notifications last (top z-layer) in world space
        this.renderNotifications(camera);
  }

  /**
   * Render drug effects around the player
   */
  renderDrugEffects(playerPos: Vec2, camera: Camera, drugs: any, gameTime: any): void {
    // Debug: log active drugs
    if (drugs && drugs.active && drugs.active.length > 0) {
    }
    
    // Check if player is on molly
    if (isOnDrug(drugs, 'molly')) {
      this.renderMollyHearts(playerPos, camera);
    }
    
    // Check if player is on MDA
    if (isOnDrug(drugs, 'mda')) {
      this.renderMDAHearts(playerPos, camera);
    }
    
    // Check if player is on MDMA
    if (isOnDrug(drugs, 'mdma')) {
      this.renderMDMAHearts(playerPos, camera);
    }
    
    // Check if player is on shrooms
    if (isOnDrug(drugs, 'shrooms')) {
      this.renderShroomsColorShift();
    }
    
    // Check if player is on acid
    if (isOnDrug(drugs, 'acid')) {
      this.renderAcidEffects(playerPos, camera);
    }
    
    // Check for psychedelic effects at night
    if (isNightTime(gameTime)) {
      const psychedelicDrugs = ['acid', 'shrooms', 'salvia', 'dmt'];
      const activePsychedelics = psychedelicDrugs.filter(drug => isOnDrug(drugs, drug));
      
      if (activePsychedelics.length > 0) {
        this.renderPsychedelicStars(playerPos, camera);
        
        // Add aurora borealis if on multiple psychedelics
        if (activePsychedelics.length >= 2) {
          this.renderAuroraBorealis(playerPos, camera);
        }
      }
    }
    
    
    // Check if player is on ketamine
    if (isOnDrug(drugs, 'ketamine')) {
      this.renderKetamineTunnelVision(playerPos, camera);
    }
    
    // Check if player is on whipits
    if (isOnDrug(drugs, 'whipits')) {
      this.renderWhipitsVignetting(camera);
    }
    
    // Check if player is on DMT
    if (isOnDrug(drugs, 'dmt')) {
      this.renderDMTEffects(playerPos, camera);
    }
    
    // Check if player is on cannabis/weed/joint
    if (isOnDrug(drugs, 'cannabis') || isOnDrug(drugs, 'weed') || isOnDrug(drugs, 'joint')) {
      this.renderCannabisEffects(playerPos, camera);
    }
  }

  /**
   * Render sparkling rainbow stars across the entire map at night when on psychedelics
   */
  renderPsychedelicStars(playerPos: Vec2, camera: Camera): void {
    const time = Date.now() * 0.001;
    
    // Save current context state
    this.ctx.save();
    
    // Create a grid of stars across the entire visible area
    const starSpacing = 40; // Distance between stars
    const viewWidth = this.canvas.width / camera.zoom;
    const viewHeight = this.canvas.height / camera.zoom;
    
    // Calculate the world bounds visible on screen
    const worldLeft = playerPos.x - viewWidth / 2;
    const worldTop = playerPos.y - viewHeight / 2;
    const worldRight = playerPos.x + viewWidth / 2;
    const worldBottom = playerPos.y + viewHeight / 2;
    
    // Generate stars in a grid pattern across the visible world
    for (let worldX = Math.floor(worldLeft / starSpacing) * starSpacing; worldX < worldRight; worldX += starSpacing) {
      for (let worldY = Math.floor(worldTop / starSpacing) * starSpacing; worldY < worldBottom; worldY += starSpacing) {
        // Convert world position to screen position
        const screenPos = worldToScreen({ x: worldX, y: worldY }, camera);
        
        // Only render stars that are on screen
        if (screenPos.x >= -10 && screenPos.x <= this.canvas.width + 10 && 
            screenPos.y >= -10 && screenPos.y <= this.canvas.height + 10) {
          
          // Create a unique seed for this star position for consistent animation
          const starSeed = Math.sin(worldX * 0.01) + Math.cos(worldY * 0.01);
          const starTime = time + starSeed * 2;
          
          // Rainbow colors that cycle over time
          const hue = (starTime * 30 + starSeed * 100) % 360;
          const saturation = 70 + Math.sin(starTime * 2 + starSeed) * 30;
          const lightness = 50 + Math.sin(starTime * 1.5 + starSeed) * 30;
          const alpha = 0.4 + Math.sin(starTime * 3 + starSeed) * 0.3;
          
          this.ctx.fillStyle = `hsla(${hue}, ${saturation}%, ${lightness}%, ${alpha})`;
          
          // Draw a small circular star (1-3 pixels)
          const starSize = Math.max(0.5, 1 + Math.sin(starTime * 2 + starSeed) * 1.5);
          this.ctx.beginPath();
          this.ctx.arc(screenPos.x, screenPos.y, starSize, 0, Math.PI * 2);
          this.ctx.fill();
          
          // Add a subtle glowing effect for some stars
          if (Math.sin(starTime * 1.5 + starSeed) > 0.7) {
            this.ctx.shadowColor = `hsl(${hue}, ${saturation}%, ${lightness}%)`;
            this.ctx.shadowBlur = 3;
            this.ctx.beginPath();
            this.ctx.arc(screenPos.x, screenPos.y, starSize * 0.5, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.shadowBlur = 0;
          }
        }
      }
    }
    
    // Restore context state
    this.ctx.restore();
  }

  /**
   * Render aurora borealis effect when on multiple psychedelics at night
   */
  renderAuroraBorealis(playerPos: Vec2, camera: Camera): void {
    const time = Date.now() * 0.001;
    
    // Save current context state
    this.ctx.save();
    
    // Create multiple layers of aurora bands
    const auroraLayers = 4;
    const viewWidth = this.canvas.width / camera.zoom;
    const viewHeight = this.canvas.height / camera.zoom;
    
    // Calculate the world bounds visible on screen
    const worldLeft = playerPos.x - viewWidth / 2;
    const worldTop = playerPos.y - viewHeight / 2;
    const worldRight = playerPos.x + viewWidth / 2;
    const worldBottom = playerPos.y + viewHeight / 2;
    
    for (let layer = 0; layer < auroraLayers; layer++) {
      const layerTime = time + layer * 0.5;
      const layerHeight = 80 + layer * 40; // Each layer is higher
      const layerOpacity = 0.3 - layer * 0.05; // Fade with height
      
      // Create flowing aurora bands
      const bandCount = 3 + layer;
      for (let band = 0; band < bandCount; band++) {
        const bandTime = layerTime + band * 0.3;
        const bandY = worldTop + (band / bandCount) * (worldBottom - worldTop) + Math.sin(bandTime * 0.5) * 50;
        
        // Create gradient for this aurora band
        const gradient = this.ctx.createLinearGradient(0, 0, 0, layerHeight);
        
        // Aurora colors - greens, blues, purples, pinks
        const colors = [
          `hsla(${(120 + band * 30) % 360}, 80%, 60%, ${layerOpacity})`,
          `hsla(${(180 + band * 40) % 360}, 70%, 50%, ${layerOpacity * 0.8})`,
          `hsla(${(240 + band * 20) % 360}, 90%, 70%, ${layerOpacity * 0.6})`,
          `hsla(${(300 + band * 35) % 360}, 85%, 65%, ${layerOpacity * 0.4})`
        ];
        
        gradient.addColorStop(0, colors[0]);
        gradient.addColorStop(0.3, colors[1]);
        gradient.addColorStop(0.6, colors[2]);
        gradient.addColorStop(1, colors[3]);
        
        this.ctx.fillStyle = gradient;
        
        // Create flowing wave pattern
        const wavePoints = [];
        const waveCount = Math.floor((worldRight - worldLeft) / 20);
        
        for (let i = 0; i <= waveCount; i++) {
          const x = worldLeft + (i / waveCount) * (worldRight - worldLeft);
          const waveOffset = Math.sin((x * 0.01) + bandTime * 0.8) * 30 + 
                           Math.sin((x * 0.02) + bandTime * 1.2) * 15 +
                           Math.sin((x * 0.005) + bandTime * 0.3) * 60;
          const y = bandY + waveOffset;
          wavePoints.push({ x, y });
        }
        
        // Draw the aurora band as a flowing shape
        this.ctx.beginPath();
        this.ctx.moveTo(wavePoints[0].x, wavePoints[0].y);
        
        for (let i = 1; i < wavePoints.length; i++) {
          const cp1x = (wavePoints[i-1].x + wavePoints[i].x) / 2;
          const cp1y = wavePoints[i-1].y;
          const cp2x = (wavePoints[i-1].x + wavePoints[i].x) / 2;
          const cp2y = wavePoints[i].y;
          
          this.ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, wavePoints[i].x, wavePoints[i].y);
        }
        
        // Complete the shape by going back along the bottom
        for (let i = wavePoints.length - 1; i >= 0; i--) {
          const x = wavePoints[i].x;
          const y = wavePoints[i].y + layerHeight + Math.sin((x * 0.01) + bandTime * 0.8) * 20;
          this.ctx.lineTo(x, y);
        }
        
        this.ctx.closePath();
        this.ctx.fill();
        
        // Add some sparkle effects on the aurora
        for (let i = 0; i < wavePoints.length; i += 3) {
          if (Math.sin((wavePoints[i].x * 0.01) + bandTime * 2) > 0.8) {
            const sparkleX = worldToScreen({ x: wavePoints[i].x, y: wavePoints[i].y }, camera);
            this.ctx.fillStyle = `hsla(${(120 + band * 30) % 360}, 100%, 90%, 0.8)`;
            this.ctx.beginPath();
            this.ctx.arc(sparkleX.x, sparkleX.y, 1, 0, Math.PI * 2);
            this.ctx.fill();
          }
        }
      }
    }
    
    // Restore context state
    this.ctx.restore();
  }

  /**
   * Render rainbow hearts coming from the player when on molly
   */
  renderMollyHearts(playerPos: Vec2, camera: Camera): void {
    const screenPos = worldToScreen(playerPos, camera);
    const time = Date.now() * 0.001; // Convert to seconds
    
    // Generate 8 hearts around the player
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2 + time * 0.5; // Rotate over time
      const distance = 30 + Math.sin(time * 2 + i) * 10; // Pulsing distance
      
      const heartX = screenPos.x + Math.cos(angle) * distance;
      const heartY = screenPos.y + Math.sin(angle) * distance;
      
      // Rainbow colors
      const hue = (i * 45 + time * 50) % 360;
      this.ctx.fillStyle = `hsl(${hue}, 100%, 70%)`;
      
      // Draw heart emoji
      this.ctx.font = '20px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText('💖', heartX, heartY);
    }
  }

  /**
   * Render pink hearts for MDA
   */
  renderMDAHearts(playerPos: Vec2, camera: Camera): void {
    const screenPos = worldToScreen(playerPos, camera);
    const time = Date.now() * 0.001;
    
    // Generate 4 pink hearts around the player
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2 + time * 0.5; // Medium rotation speed
      const distance = 35 + Math.sin(time * 1.5 + i) * 8; // Gentle floating motion
      
      const heartX = screenPos.x + Math.cos(angle) * distance;
      const heartY = screenPos.y + Math.sin(angle) * distance;
      
      // Pink colors
      const pinkIntensity = 0.7 + Math.sin(time * 2 + i) * 0.3;
      this.ctx.fillStyle = `rgba(255, ${Math.floor(192 * pinkIntensity)}, ${Math.floor(203 * pinkIntensity)}, 0.8)`;
      
      // Draw heart emoji
      this.ctx.font = '18px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText('💕', heartX, heartY);
    }
  }

  /**
   * Render purple hearts for MDMA
   */
  renderMDMAHearts(playerPos: Vec2, camera: Camera): void {
    const screenPos = worldToScreen(playerPos, camera);
    const time = Date.now() * 0.001;
    
    // Generate 5 purple hearts around the player
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2 + time * 0.4; // Slower rotation
      const distance = 40 + Math.sin(time * 1.8 + i) * 12; // More floating motion
      
      const heartX = screenPos.x + Math.cos(angle) * distance;
      const heartY = screenPos.y + Math.sin(angle) * distance;
      
      // Purple colors
      const purpleIntensity = 0.6 + Math.sin(time * 1.5 + i) * 0.4;
      this.ctx.fillStyle = `rgba(${Math.floor(128 * purpleIntensity)}, 0, ${Math.floor(255 * purpleIntensity)}, 0.9)`;
      
      // Draw heart emoji
      this.ctx.font = '22px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText('💜', heartX, heartY);
    }
  }

  /**
   * Render color-shifting effect for shrooms
   */
  renderShroomsColorShift(): void {
    const time = Date.now() * 0.001; // Convert to seconds
    
    // Create a color-shifting overlay
    const gradient = this.ctx.createRadialGradient(
      this.canvas.width / 2, this.canvas.height / 2, 0,
      this.canvas.width / 2, this.canvas.height / 2, Math.max(this.canvas.width, this.canvas.height) / 2
    );
    
    // Add color stops that shift over time
    const hue1 = (time * 30) % 360;
    const hue2 = (time * 30 + 120) % 360;
    const hue3 = (time * 30 + 240) % 360;
    
    gradient.addColorStop(0, `hsla(${hue1}, 70%, 50%, 0.3)`);
    gradient.addColorStop(0.5, `hsla(${hue2}, 70%, 50%, 0.2)`);
    gradient.addColorStop(1, `hsla(${hue3}, 70%, 50%, 0.3)`);
    
    // Apply the gradient overlay
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  /**
   * Render crazy acid visual effects
   */
  renderAcidEffects(playerPos: Vec2, camera: Camera): void {
    const time = Date.now() * 0.001;
    const screenPos = worldToScreen(playerPos, camera);
    
    // Save current context state
    this.ctx.save();
    
    // Create multiple layers of crazy effects
    for (let layer = 0; layer < 3; layer++) {
      const layerTime = time + layer * 0.5;
      
      // Rotating geometric patterns centered on player
      this.ctx.translate(screenPos.x, screenPos.y);
      this.ctx.rotate(layerTime * 0.3 + layer * Math.PI / 3);
      
      // Create kaleidoscope effect
      for (let i = 0; i < 8; i++) {
        this.ctx.save();
        this.ctx.rotate((i / 8) * Math.PI * 2);
        
        // Draw geometric shapes with crazy colors
        const hue = (layerTime * 100 + i * 45) % 360;
        this.ctx.fillStyle = `hsla(${hue}, 100%, 60%, 0.1)`;
        this.ctx.strokeStyle = `hsla(${hue + 60}, 100%, 70%, 0.2)`;
        this.ctx.lineWidth = 2;
        
        // Draw triangles, squares, and circles
        const shapeType = Math.floor(layerTime + i) % 3;
        const size = 50 + Math.sin(layerTime * 2 + i) * 30;
        
        this.ctx.beginPath();
        if (shapeType === 0) {
          // Triangle
          this.ctx.moveTo(0, -size);
          this.ctx.lineTo(-size * 0.866, size * 0.5);
          this.ctx.lineTo(size * 0.866, size * 0.5);
          this.ctx.closePath();
        } else if (shapeType === 1) {
          // Square
          this.ctx.rect(-size/2, -size/2, size, size);
        } else {
          // Circle
          this.ctx.arc(0, 0, size/2, 0, Math.PI * 2);
        }
        
        this.ctx.fill();
        this.ctx.stroke();
        this.ctx.restore();
      }
      
      this.ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform
    }
    
    // Add pulsing overlay
    const pulseAlpha = 0.1 + Math.sin(time * 3) * 0.05;
    this.ctx.fillStyle = `hsla(${(time * 50) % 360}, 100%, 50%, ${pulseAlpha})`;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Restore context state
    this.ctx.restore();
  }

  /**
   * Render balloons floating around the player when on whipits
   */
  renderWhipitsBalloons(playerPos: Vec2, camera: Camera): void {
    const screenPos = worldToScreen(playerPos, camera);
    const time = Date.now() * 0.001;
    
    // Generate 6 balloons around the player
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2 + time * 0.3; // Slow rotation
      const distance = 40 + Math.sin(time * 2 + i) * 15; // Gentle floating motion
      
      const balloonX = screenPos.x + Math.cos(angle) * distance;
      const balloonY = screenPos.y + Math.sin(angle) * distance - Math.sin(time * 3 + i) * 10; // Up and down floating
      
      // Red balloons for whipits
      const balloon = '🎈';
      
      // Draw balloon emoji
      this.ctx.font = '24px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(balloon, balloonX, balloonY);
      
      // Add string line from balloon to player
      this.ctx.strokeStyle = '#8b4513'; // Brown string
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.moveTo(balloonX, balloonY + 12); // Bottom of balloon
      this.ctx.lineTo(screenPos.x, screenPos.y + 20); // To player
      this.ctx.stroke();
    }
  }

  /**
   * Render vignetting effect for whipits
   */
  renderWhipitsVignetting(_camera: Camera): void {
    const canvasWidth = this.canvas.width;
    const canvasHeight = this.canvas.height;
    
    // Create radial gradient for vignetting effect
    const centerX = canvasWidth / 2;
    const centerY = canvasHeight / 2;
    const radius = Math.max(canvasWidth, canvasHeight) * 0.8;
    
    const gradient = this.ctx.createRadialGradient(
      centerX, centerY, 0,
      centerX, centerY, radius
    );
    
    // Dark vignetting with slight red tint
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0)'); // Transparent center
    gradient.addColorStop(0.6, 'rgba(0, 0, 0, 0.3)'); // Light darkening
    gradient.addColorStop(0.8, 'rgba(20, 0, 0, 0.6)'); // Red-tinted darkening
    gradient.addColorStop(1, 'rgba(40, 0, 0, 0.8)'); // Strong red-tinted darkening
    
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  }


  /**
   * Render extremely intense DMT visual effects
   */
  renderDMTEffects(playerPos: Vec2, camera: Camera): void {
    const time = Date.now() * 0.001;
    const screenPos = worldToScreen(playerPos, camera);
    const canvasWidth = this.canvas.width;
    const canvasHeight = this.canvas.height;
    
    // Save context state
    this.ctx.save();
    
    // 1. INTENSE KALEIDOSCOPE PATTERNS
    for (let layer = 0; layer < 3; layer++) {
      const layerScale = 1 + layer * 0.5;
      const layerSpeed = 2 + layer * 1.5;
      
      for (let i = 0; i < 12; i++) {
        const angle = (i / 12) * Math.PI * 2 + time * layerSpeed;
        const radius = (80 + layer * 40) + Math.sin(time * 4 + i + layer) * 30;
        const centerX = screenPos.x + Math.cos(angle) * radius;
        const centerY = screenPos.y + Math.sin(angle) * radius;
        
        this.ctx.save();
        this.ctx.translate(centerX, centerY);
        this.ctx.rotate(time * layerSpeed + i);
        this.ctx.scale(layerScale, layerScale);
        
        // Intense colors
        const hue = (time * 100 + i * 30 + layer * 60) % 360;
        this.ctx.fillStyle = `hsla(${hue}, 100%, 60%, 0.4)`;
        this.ctx.strokeStyle = `hsla(${hue + 60}, 100%, 80%, 0.6)`;
        this.ctx.lineWidth = 2;
        
        // Complex geometric shapes
        this.ctx.beginPath();
        for (let j = 0; j < 6; j++) {
          const shapeAngle = (j / 6) * Math.PI * 2;
          const shapeRadius = 15 + Math.sin(time * 3 + j) * 8;
          const x = Math.cos(shapeAngle) * shapeRadius;
          const y = Math.sin(shapeAngle) * shapeRadius;
          
          if (j === 0) this.ctx.moveTo(x, y);
          else this.ctx.lineTo(x, y);
        }
        this.ctx.closePath();
        this.ctx.fill();
        this.ctx.stroke();
        
        this.ctx.restore();
      }
    }
    
    // 2. PULSING ENERGY BURSTS
    for (let burst = 0; burst < 8; burst++) {
      const burstAngle = (burst / 8) * Math.PI * 2 + time * 1.5;
      const burstDistance = 60 + Math.sin(time * 2 + burst) * 40;
      const burstX = screenPos.x + Math.cos(burstAngle) * burstDistance;
      const burstY = screenPos.y + Math.sin(burstAngle) * burstDistance;
      
      const burstSize = 20 + Math.sin(time * 5 + burst) * 15;
      const burstAlpha = 0.3 + Math.sin(time * 6 + burst) * 0.2;
      
      // Energy burst gradient
      const burstGradient = this.ctx.createRadialGradient(
        burstX, burstY, 0,
        burstX, burstY, burstSize
      );
      burstGradient.addColorStop(0, `rgba(255, 255, 255, ${burstAlpha})`);
      burstGradient.addColorStop(0.5, `rgba(255, 0, 255, ${burstAlpha * 0.7})`);
      burstGradient.addColorStop(1, `rgba(0, 255, 255, 0)`);
      
      this.ctx.fillStyle = burstGradient;
      this.ctx.beginPath();
      this.ctx.arc(burstX, burstY, burstSize, 0, Math.PI * 2);
      this.ctx.fill();
    }
    
    // 3. INTENSE RAINBOW OVERLAY
    const overlayIntensity = 0.4 + Math.sin(time * 3) * 0.3;
    const overlayGradient = this.ctx.createRadialGradient(
      screenPos.x, screenPos.y, 0,
      screenPos.x, screenPos.y, Math.max(canvasWidth, canvasHeight) * 0.8
    );
    
    overlayGradient.addColorStop(0, `rgba(255, 0, 255, ${overlayIntensity * 0.4})`);
    overlayGradient.addColorStop(0.2, `rgba(0, 255, 255, ${overlayIntensity * 0.3})`);
    overlayGradient.addColorStop(0.4, `rgba(255, 255, 0, ${overlayIntensity * 0.3})`);
    overlayGradient.addColorStop(0.6, `rgba(255, 0, 128, ${overlayIntensity * 0.2})`);
    overlayGradient.addColorStop(0.8, `rgba(128, 0, 255, ${overlayIntensity * 0.2})`);
    overlayGradient.addColorStop(1, `rgba(0, 128, 255, ${overlayIntensity * 0.1})`);
    
    this.ctx.fillStyle = overlayGradient;
    this.ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    
    // 4. RAPIDLY CHANGING BACKGROUND COLORS
    const bgHue = (time * 200) % 360;
    const bgAlpha = 0.1 + Math.sin(time * 8) * 0.05;
    this.ctx.fillStyle = `hsla(${bgHue}, 100%, 50%, ${bgAlpha})`;
    this.ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    
    // 5. SPIRALING LIGHT RAYS
    for (let ray = 0; ray < 16; ray++) {
      const rayAngle = (ray / 16) * Math.PI * 2 + time * 2;
      const rayLength = 200 + Math.sin(time * 3 + ray) * 100;
      const rayEndX = screenPos.x + Math.cos(rayAngle) * rayLength;
      const rayEndY = screenPos.y + Math.sin(rayAngle) * rayLength;
      
      const rayGradient = this.ctx.createLinearGradient(
        screenPos.x, screenPos.y,
        rayEndX, rayEndY
      );
      rayGradient.addColorStop(0, `rgba(255, 255, 255, 0.8)`);
      rayGradient.addColorStop(0.5, `rgba(255, 0, 255, 0.4)`);
      rayGradient.addColorStop(1, `rgba(0, 255, 255, 0)`);
      
      this.ctx.strokeStyle = rayGradient;
      this.ctx.lineWidth = 3;
      this.ctx.beginPath();
      this.ctx.moveTo(screenPos.x, screenPos.y);
      this.ctx.lineTo(rayEndX, rayEndY);
      this.ctx.stroke();
    }
    
    // Restore context state
    this.ctx.restore();
  }

  /**
   * Render cannabis/weed/joint visual effects - floating green particles
   */
  renderCannabisEffects(playerPos: Vec2, camera: Camera): void {
    const time = Date.now() * 0.001;
    const screenPos = worldToScreen(playerPos, camera);
    
    // Save context state
    this.ctx.save();
    
    // Create floating green particles around the player
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2 + time * 0.3; // Slow rotation
      const distance = 40 + Math.sin(time * 1.5 + i * 0.5) * 20; // Gentle floating motion
      const particleX = screenPos.x + Math.cos(angle) * distance;
      const particleY = screenPos.y + Math.sin(angle) * distance;
      
      // Vary particle size and opacity
      const size = 3 + Math.sin(time * 2 + i) * 2;
      const alpha = 0.6 + Math.sin(time * 1.5 + i * 0.3) * 0.3;
      
      // Green color variations
      const greenHue = 120 + Math.sin(time + i) * 20; // Green with slight variation
      this.ctx.fillStyle = `hsla(${greenHue}, 70%, 60%, ${alpha})`;
      
      // Draw particle as a small circle
      this.ctx.beginPath();
      this.ctx.arc(particleX, particleY, size, 0, Math.PI * 2);
      this.ctx.fill();
      
      // Add a subtle glow effect
      this.ctx.shadowColor = `hsl(${greenHue}, 70%, 60%)`;
      this.ctx.shadowBlur = 8;
      this.ctx.beginPath();
      this.ctx.arc(particleX, particleY, size * 0.5, 0, Math.PI * 2);
      this.ctx.fill();
    }
    
    // Add some floating leaf shapes
    for (let i = 0; i < 6; i++) {
      const leafAngle = (i / 6) * Math.PI * 2 + time * 0.2;
      const leafDistance = 60 + Math.sin(time * 0.8 + i) * 30;
      const leafX = screenPos.x + Math.cos(leafAngle) * leafDistance;
      const leafY = screenPos.y + Math.sin(leafAngle) * leafDistance;
      
      const leafSize = 4 + Math.sin(time * 1.2 + i) * 2;
      const leafAlpha = 0.4 + Math.sin(time * 0.9 + i * 0.4) * 0.2;
      
      this.ctx.fillStyle = `hsla(120, 60%, 50%, ${leafAlpha})`;
      this.ctx.shadowColor = 'transparent';
      
      // Draw simple leaf shape (oval)
      this.ctx.save();
      this.ctx.translate(leafX, leafY);
      this.ctx.rotate(leafAngle + time * 0.1);
      this.ctx.scale(1, 0.6);
      this.ctx.beginPath();
      this.ctx.arc(0, 0, leafSize, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    }
    
    // Restore context state
    this.ctx.restore();
  }

  /**
   * Render ketamine tunnel vision effect
   */
  private renderKetamineTunnelVision(playerPos: Vec2, camera: Camera): void {
    this.ctx.save();
    
    // Create a dark overlay with a small circular "tunnel" around the player
    const canvasWidth = this.ctx.canvas.width;
    const canvasHeight = this.ctx.canvas.height;
    
    // Convert player world position to screen position
    const screenPlayerX = playerPos.x - camera.x + canvasWidth / 2;
    const screenPlayerY = playerPos.y - camera.y + canvasHeight / 2;
    
    // Safety check for non-finite values
    if (!isFinite(screenPlayerX) || !isFinite(screenPlayerY)) {
      this.ctx.restore();
      return;
    }
    
    // Create radial gradient for tunnel vision effect
    const gradient = this.ctx.createRadialGradient(
      screenPlayerX, screenPlayerY, 0,  // Center of tunnel
      screenPlayerX, screenPlayerY, 150 // Edge of tunnel (150px radius)
    );
    
    // Dark tunnel vision - only small area around player is visible
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');      // Transparent center
    gradient.addColorStop(0.7, 'rgba(0, 0, 0, 0.3)');  // Slight darkening
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0.95)');   // Very dark edges
    
    // Fill the entire screen with the gradient
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    
    // Add a subtle pulsing effect to the tunnel
    const time = Date.now() * 0.001;
    const pulseIntensity = 0.1 + Math.sin(time * 2) * 0.05;
    
    // Create a second gradient for the pulsing effect
    const pulseGradient = this.ctx.createRadialGradient(
      screenPlayerX, screenPlayerY, 0,
      screenPlayerX, screenPlayerY, 120
    );
    
    pulseGradient.addColorStop(0, `rgba(0, 0, 0, ${pulseIntensity})`);
    pulseGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    
    this.ctx.fillStyle = pulseGradient;
    this.ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    
    // Add some subtle visual distortion around the edges
    this.ctx.strokeStyle = `rgba(100, 100, 100, ${0.1 + Math.sin(time * 3) * 0.05})`;
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.arc(screenPlayerX, screenPlayerY, 140, 0, Math.PI * 2);
    this.ctx.stroke();
    
    this.ctx.restore();
  }

  /**
   * Render subtle glow around art cars so they're always visible
   */
  private renderArtCarGlow(artCars: any[], camera: Camera): void {
    if (!artCars) return;
    
    this.ctx.save();
    
    for (const car of artCars) {
      const carScreenPos = worldToScreen(car.pos, camera);
      const glowRadius = 40 * car.size;
      
      // Create subtle white glow
      const glowGradient = this.ctx.createRadialGradient(
        carScreenPos.x, carScreenPos.y, 0,
        carScreenPos.x, carScreenPos.y, glowRadius
      );
      
      glowGradient.addColorStop(0, 'rgba(255, 255, 255, 0.1)');
      glowGradient.addColorStop(0.5, 'rgba(255, 255, 255, 0.05)');
      glowGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
      
      this.ctx.fillStyle = glowGradient;
      this.ctx.fillRect(
        carScreenPos.x - glowRadius,
        carScreenPos.y - glowRadius,
        glowRadius * 2,
        glowRadius * 2
      );
    }
    
    this.ctx.restore();
  }

  /**
   * Render detailed Hell Station with Burning Man theming
   */
  private renderHellStation(hellStation: any, camera: Camera): void {
    const stationScreenPos = worldToScreen({ x: hellStation.aabb.x, y: hellStation.aabb.y }, camera);
    const stationScreenSize = { w: hellStation.aabb.w * camera.zoom, h: hellStation.aabb.h * camera.zoom };
    const centerX = stationScreenPos.x + stationScreenSize.w / 2;
    const centerY = stationScreenPos.y + stationScreenSize.h / 2;
    const time = Date.now() * 0.001;
    
    // Station base platform with metal texture
    const baseGradient = this.ctx.createLinearGradient(
      stationScreenPos.x, stationScreenPos.y,
      stationScreenPos.x + stationScreenSize.w, stationScreenPos.y + stationScreenSize.h
    );
    baseGradient.addColorStop(0, '#2c2c2c');
    baseGradient.addColorStop(0.3, '#1a1a1a');
    baseGradient.addColorStop(0.7, '#333333');
    baseGradient.addColorStop(1, '#2c2c2c');
    
    this.ctx.fillStyle = baseGradient;
    this.ctx.fillRect(stationScreenPos.x, stationScreenPos.y, stationScreenSize.w, stationScreenSize.h);
    
    // Metal border with rivets
    this.ctx.strokeStyle = '#444444';
    this.ctx.lineWidth = 3;
    this.ctx.strokeRect(stationScreenPos.x, stationScreenPos.y, stationScreenSize.w, stationScreenSize.h);
    
    // Add rivets around the border
    this.ctx.fillStyle = '#666666';
    const rivetSpacing = 30;
    for (let x = stationScreenPos.x + 15; x < stationScreenPos.x + stationScreenSize.w; x += rivetSpacing) {
      for (let y = stationScreenPos.y + 15; y < stationScreenPos.y + stationScreenSize.h; y += rivetSpacing) {
        this.ctx.beginPath();
        this.ctx.arc(x, y, 2, 0, Math.PI * 2);
        this.ctx.fill();
      }
    }
    
    // Central fuel tower structure
    const towerWidth = stationScreenSize.w * 0.3;
    const towerHeight = stationScreenSize.h * 0.8;
    const towerX = centerX - towerWidth / 2;
    const towerY = centerY - towerHeight / 2;
    
    // Tower gradient
    const towerGradient = this.ctx.createLinearGradient(towerX, towerY, towerX + towerWidth, towerY + towerHeight);
    towerGradient.addColorStop(0, '#8B4513');
    towerGradient.addColorStop(0.5, '#A0522D');
    towerGradient.addColorStop(1, '#654321');
    
    this.ctx.fillStyle = towerGradient;
    this.ctx.fillRect(towerX, towerY, towerWidth, towerHeight);
    
    // Tower metal bands
    this.ctx.strokeStyle = '#444444';
    this.ctx.lineWidth = 2;
    for (let i = 0; i < 4; i++) {
      const bandY = towerY + (towerHeight / 4) * i;
      this.ctx.beginPath();
      this.ctx.moveTo(towerX, bandY);
      this.ctx.lineTo(towerX + towerWidth, bandY);
      this.ctx.stroke();
    }
    
    // Fuel storage tanks on sides
    const tankRadius = stationScreenSize.w * 0.15;
    const leftTankX = stationScreenPos.x + tankRadius + 20;
    const rightTankX = stationScreenPos.x + stationScreenSize.w - tankRadius - 20;
    const tankY = centerY;
    
    // Left tank
    const leftTankGradient = this.ctx.createRadialGradient(leftTankX, tankY, 0, leftTankX, tankY, tankRadius);
    leftTankGradient.addColorStop(0, '#C0C0C0');
    leftTankGradient.addColorStop(0.7, '#808080');
    leftTankGradient.addColorStop(1, '#404040');
    
    this.ctx.fillStyle = leftTankGradient;
    this.ctx.beginPath();
    this.ctx.arc(leftTankX, tankY, tankRadius, 0, Math.PI * 2);
    this.ctx.fill();
    
    // Right tank
    const rightTankGradient = this.ctx.createRadialGradient(rightTankX, tankY, 0, rightTankX, tankY, tankRadius);
    rightTankGradient.addColorStop(0, '#C0C0C0');
    rightTankGradient.addColorStop(0.7, '#808080');
    rightTankGradient.addColorStop(1, '#404040');
    
    this.ctx.fillStyle = rightTankGradient;
    this.ctx.beginPath();
    this.ctx.arc(rightTankX, tankY, tankRadius, 0, Math.PI * 2);
    this.ctx.fill();
    
    // Tank highlights
    this.ctx.strokeStyle = '#E0E0E0';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.arc(leftTankX, tankY, tankRadius, 0, Math.PI * 2);
    this.ctx.stroke();
    this.ctx.beginPath();
    this.ctx.arc(rightTankX, tankY, tankRadius, 0, Math.PI * 2);
    this.ctx.stroke();
    
    // Pipes connecting tanks to tower
    this.ctx.strokeStyle = '#666666';
    this.ctx.lineWidth = 8;
    this.ctx.beginPath();
    this.ctx.moveTo(leftTankX + tankRadius, tankY);
    this.ctx.lineTo(towerX, centerY);
    this.ctx.stroke();
    this.ctx.beginPath();
    this.ctx.moveTo(rightTankX - tankRadius, tankY);
    this.ctx.lineTo(towerX + towerWidth, centerY);
    this.ctx.stroke();
    
    // Flaming torches around the station
    const torchCount = 6;
    for (let i = 0; i < torchCount; i++) {
      const angle = (i / torchCount) * Math.PI * 2;
      const torchDistance = Math.min(stationScreenSize.w, stationScreenSize.h) * 0.4;
      const torchX = centerX + Math.cos(angle) * torchDistance;
      const torchY = centerY + Math.sin(angle) * torchDistance;
      
      // Torch post
      this.ctx.fillStyle = '#8B4513';
      this.ctx.fillRect(torchX - 3, torchY - 20, 6, 20);
      
      // Flame effect
      const flameIntensity = 0.7 + Math.sin(time * 3 + i) * 0.3;
      const flameGradient = this.ctx.createRadialGradient(torchX, torchY - 25, 0, torchX, torchY - 25, 15);
      flameGradient.addColorStop(0, `rgba(255, 100, 0, ${flameIntensity})`);
      flameGradient.addColorStop(0.5, `rgba(255, 150, 0, ${flameIntensity * 0.7})`);
      flameGradient.addColorStop(1, `rgba(255, 200, 0, 0)`);
      
      this.ctx.fillStyle = flameGradient;
      this.ctx.beginPath();
      this.ctx.arc(torchX, torchY - 25, 15, 0, Math.PI * 2);
      this.ctx.fill();
    }
    
    // Warning lights
    const warningLightIntensity = Math.sin(time * 4) > 0 ? 1 : 0.3;
    this.ctx.fillStyle = `rgba(255, 0, 0, ${warningLightIntensity})`;
    this.ctx.beginPath();
    this.ctx.arc(centerX, stationScreenPos.y + 20, 8, 0, Math.PI * 2);
    this.ctx.fill();
    
    // Station label
    this.ctx.fillStyle = '#FF6B35';
    this.ctx.font = 'bold 20px system-ui';
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText('HELL STATION', centerX, stationScreenPos.y - 30);
    
    // Subtitle
    this.ctx.fillStyle = '#FFB366';
    this.ctx.font = '14px system-ui';
    this.ctx.fillText('Fuel & Fire', centerX, stationScreenPos.y - 10);
    
    // Steam/smoke effects
    for (let i = 0; i < 3; i++) {
      const smokeX = centerX + (Math.sin(time * 0.5 + i) * 20);
      const smokeY = stationScreenPos.y + 10 + Math.sin(time * 2 + i) * 5;
      const smokeSize = 8 + Math.sin(time * 3 + i) * 4;
      
      this.ctx.fillStyle = `rgba(200, 200, 200, ${0.3 + Math.sin(time * 2 + i) * 0.2})`;
      this.ctx.beginPath();
      this.ctx.arc(smokeX, smokeY, smokeSize, 0, Math.PI * 2);
      this.ctx.fill();
    }
    
    // Station boundary glow
    const glowGradient = this.ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, Math.max(stationScreenSize.w, stationScreenSize.h) * 0.6);
    glowGradient.addColorStop(0, 'rgba(255, 100, 50, 0.1)');
    glowGradient.addColorStop(1, 'rgba(255, 100, 50, 0)');
    
    this.ctx.fillStyle = glowGradient;
    this.ctx.fillRect(stationScreenPos.x - 50, stationScreenPos.y - 50, stationScreenSize.w + 100, stationScreenSize.h + 100);
  }

  /**
   * Render lighting effects including art car auras and dust storms
   */
  private renderLightingEffects(gameState: any, camera: Camera): void {
    const canvasWidth = this.ctx.canvas.width;
    const canvasHeight = this.ctx.canvas.height;
    const playerScreenPos = worldToScreen(gameState.player.position, camera);
    const time = Date.now() * 0.001;
    
    // Check if it's night time
    const isNight = isNightTime(gameState.time);
    
    // Render dust storm first (if active)
    if (gameState.dustStorm && gameState.dustStorm.active) {
      this.renderDustStorm(gameState.dustStorm, camera);
    }
    
    // Render art car auras at night (only for visible art cars or mounted car)
    if (isNight && gameState.artCars) {
      const visibilityRadius = this.getVisibilityRadius(gameState);
      const visibleArtCars = gameState.artCars.filter(car => 
        this.isWithinVisibility(car.pos, gameState.player.position, visibilityRadius) ||
        car.id === gameState.player.mountedOn
      );
      this.renderArtCarAuras(visibleArtCars, camera);
    }
  }

  /**
   * Render dust storm white-out effect
   */
  private renderDustStorm(dustStorm: any, camera: Camera): void {
    const canvasWidth = this.ctx.canvas.width;
    const canvasHeight = this.ctx.canvas.height;
    const time = Date.now() * 0.001;
    
    // Create dust storm overlay
    const stormIntensity = dustStorm.intensity;
    const baseOpacity = stormIntensity * 0.8;
    
    // Animated dust particles
    for (let i = 0; i < 200; i++) {
      const particleX = (Math.sin(time * 0.5 + i * 0.1) * canvasWidth * 0.5) + canvasWidth * 0.5;
      const particleY = (Math.cos(time * 0.3 + i * 0.15) * canvasHeight * 0.5) + canvasHeight * 0.5;
      const particleSize = 2 + Math.sin(time * 2 + i) * 1;
      const particleOpacity = baseOpacity * (0.3 + Math.sin(time * 3 + i) * 0.2);
      
      this.ctx.fillStyle = `rgba(255, 255, 255, ${particleOpacity})`;
      this.ctx.beginPath();
      this.ctx.arc(particleX, particleY, particleSize, 0, Math.PI * 2);
      this.ctx.fill();
    }
    
    // Overall white-out overlay
    const overlayOpacity = stormIntensity * 0.6;
    this.ctx.fillStyle = `rgba(255, 255, 255, ${overlayOpacity})`;
    this.ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    
    // Wind effect lines
    for (let i = 0; i < 50; i++) {
      const lineX = (time * 100 + i * 20) % (canvasWidth + 100) - 50;
      const lineY = canvasHeight * 0.2 + Math.sin(time * 2 + i) * canvasHeight * 0.1;
      const lineLength = 50 + Math.sin(time * 3 + i) * 20;
      const lineOpacity = baseOpacity * 0.3;
      
      this.ctx.strokeStyle = `rgba(255, 255, 255, ${lineOpacity})`;
      this.ctx.lineWidth = 1;
      this.ctx.beginPath();
      this.ctx.moveTo(lineX, lineY);
      this.ctx.lineTo(lineX + lineLength, lineY);
      this.ctx.stroke();
    }
  }

  /**
   * Render fog of war with limited visibility at night
   */
  private renderFogOfWar(gameState: any, camera: Camera): void {
    const playerScreenPos = worldToScreen(gameState.player.position, camera);
    const canvasWidth = this.ctx.canvas.width;
    const canvasHeight = this.ctx.canvas.height;
    const isNight = isNightTime(gameState.time);
    const weather = gameState.weather;
    
    // Check if player has WHITE light bulbs for actual illumination (not colored ones)
    // Only count if lights are turned on
    const whiteLightBulbTypes = [
      'Light Bulb', 'Light Bulb White', 'Light Bulb white'
    ];
    
    let totalWhiteLightBulbs = 0;
    if (gameState.player.lightsOn) {
      for (const bulbType of whiteLightBulbTypes) {
        const count = gameState.player.inventory.items.get(bulbType) || 0;
        totalWhiteLightBulbs += count;
      }
    }
    
    // Create radial gradient for visibility around player
    let visibilityRadius = this.getVisibilityRadius(gameState);
    
    // Enhance visibility radius if player has WHITE light bulbs (actual illumination)
    if (totalWhiteLightBulbs > 0) {
      const lightBoost = totalWhiteLightBulbs * 50; // 50px per white light bulb
      visibilityRadius += lightBoost;
    }
    
    const gradient = this.ctx.createRadialGradient(
      playerScreenPos.x, playerScreenPos.y, 0,
      playerScreenPos.x, playerScreenPos.y, visibilityRadius
    );
    
    // Adjust gradient based on WHITE light bulb presence (actual illumination)
    const hasWhiteLightBulbs = totalWhiteLightBulbs > 0;
    
    // Apply weather effects to fog
    let weatherMultiplier = 1.0;
    let weatherColor = 'rgba(0, 0, 0,';
    
    if (weather.type === 'thunderstorm') {
      weatherMultiplier = 1.2 + weather.intensity * 0.5; // Moderately darker during thunderstorms
      weatherColor = 'rgba(20, 20, 40,'; // Darker but less purple for storms
    } else if (weather.type === 'nice') {
      weatherMultiplier = 0.5 + (1 - weather.intensity) * 0.3; // Lighter during nice weather
      weatherColor = 'rgba(0, 0, 0,'; // Normal dark fog
    } else if (weather.type === 'overcast') {
      weatherMultiplier = 0.8 + (1 - weather.intensity) * 0.4; // Slightly darker during overcast
      weatherColor = 'rgba(30, 30, 30,'; // Slightly gray fog
    }

    if (isNight) {
      if (hasWhiteLightBulbs) {
        // Much brighter at night with WHITE light bulbs - almost like day
        gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');      // Completely clear center
        gradient.addColorStop(0.5, `${weatherColor}${0.05 * weatherMultiplier})`); // Barely any darkening
        gradient.addColorStop(0.8, `${weatherColor}${0.15 * weatherMultiplier})`); // Very light darkening
        gradient.addColorStop(1, `${weatherColor}${0.3 * weatherMultiplier})`);    // Light edge
      } else {
        // Dark fog of war at night without WHITE light
        gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');      // Clear center
        gradient.addColorStop(0.6, `${weatherColor}${0.3 * weatherMultiplier})`);  // Gradual darkening
        gradient.addColorStop(0.8, `${weatherColor}${0.6 * weatherMultiplier})`);  // Dark but not black
        gradient.addColorStop(1, `${weatherColor}${0.8 * weatherMultiplier})`);    // Very dark but not complete black
      }
    } else {
      if (hasWhiteLightBulbs) {
        // Very bright during day with WHITE light bulbs - minimal fog
        gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');      // Completely clear center
        gradient.addColorStop(0.6, `${weatherColor}${0.02 * weatherMultiplier})`); // Almost no darkening
        gradient.addColorStop(0.9, `${weatherColor}${0.1 * weatherMultiplier})`);  // Very light darkening
        gradient.addColorStop(1, `${weatherColor}${0.2 * weatherMultiplier})`);    // Light edge
      } else {
        // Moderate fog of war during day - still limits visibility significantly
        gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');      // Clear center
        gradient.addColorStop(0.5, `${weatherColor}${0.1 * weatherMultiplier})`);  // Light darkening
        gradient.addColorStop(0.7, `${weatherColor}${0.3 * weatherMultiplier})`);  // Moderate darkening
        gradient.addColorStop(0.9, `${weatherColor}${0.6 * weatherMultiplier})`);  // Dark
        gradient.addColorStop(1, `${weatherColor}${0.8 * weatherMultiplier})`);    // Very dark
      }
    }
    
    // Fill entire screen with overlay (apply weather effects)
    let baseOverlayOpacity: number;
    let overlayColor: string;
    
    if (isNight) {
      if (hasWhiteLightBulbs) {
        baseOverlayOpacity = 0.5;
      } else {
        baseOverlayOpacity = 0.7;
      }
    } else {
      if (hasWhiteLightBulbs) {
        baseOverlayOpacity = 0.2;
      } else {
        baseOverlayOpacity = 0.4;
      }
    }
    
    // Apply weather effects to overlay
    if (weather.type === 'thunderstorm') {
      overlayColor = `rgba(20, 20, 40, ${baseOverlayOpacity * weatherMultiplier})`;
    } else if (weather.type === 'nice') {
      overlayColor = `rgba(0, 0, 0, ${baseOverlayOpacity * weatherMultiplier})`;
    } else if (weather.type === 'overcast') {
      overlayColor = `rgba(30, 30, 30, ${baseOverlayOpacity * weatherMultiplier})`;
    } else {
      overlayColor = `rgba(0, 0, 0, ${baseOverlayOpacity})`;
    }
    
    this.ctx.fillStyle = overlayColor;
    this.ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    
    // Apply visibility gradient
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  }

  /**
   * Render colored light bulb with appropriate effects
   */
  private renderColoredLightBulb(screenPos: Vec2, size: number, type: string): void {
    this.ctx.save();
    
    const time = Date.now() * 0.0008; // Much slower cycling speed
    
    // Get color based on type
    let color1, color2, color3;
    switch (type) {
      case 'light-bulb-white':
        color1 = 'rgba(255, 255, 255, 0.8)';
        color2 = 'rgba(255, 255, 255, 0.6)';
        color3 = 'rgba(255, 255, 255, 0.4)';
        break;
      case 'light-bulb-red':
        color1 = 'rgba(255, 100, 100, 0.8)';
        color2 = 'rgba(255, 50, 50, 0.6)';
        color3 = 'rgba(255, 0, 0, 0.4)';
        break;
      case 'light-bulb-green':
        color1 = 'rgba(100, 255, 100, 0.8)';
        color2 = 'rgba(50, 255, 50, 0.6)';
        color3 = 'rgba(0, 255, 0, 0.4)';
        break;
      case 'light-bulb-blue':
        color1 = 'rgba(100, 100, 255, 0.8)';
        color2 = 'rgba(50, 50, 255, 0.6)';
        color3 = 'rgba(0, 0, 255, 0.4)';
        break;
      case 'light-bulb-orange':
        color1 = 'rgba(255, 165, 100, 0.8)';
        color2 = 'rgba(255, 140, 50, 0.6)';
        color3 = 'rgba(255, 165, 0, 0.4)';
        break;
      case 'light-bulb-purple':
        color1 = 'rgba(200, 100, 255, 0.8)';
        color2 = 'rgba(150, 50, 255, 0.6)';
        color3 = 'rgba(128, 0, 255, 0.4)';
        break;
      case 'light-bulb-rainbow':
        // Rainbow cycling colors
        const hue1 = (time * 60) % 360;
        const hue2 = (hue1 + 60) % 360;
        const hue3 = (hue2 + 60) % 360;
        color1 = `hsla(${hue1}, 100%, 70%, 0.8)`;
        color2 = `hsla(${hue2}, 100%, 60%, 0.6)`;
        color3 = `hsla(${hue3}, 100%, 50%, 0.4)`;
        break;
      default:
        color1 = 'rgba(255, 255, 255, 0.8)';
        color2 = 'rgba(255, 255, 255, 0.6)';
        color3 = 'rgba(255, 255, 255, 0.4)';
    }
    
    // Create radial gradient
    const gradient = this.ctx.createRadialGradient(
      screenPos.x, screenPos.y, 0,
      screenPos.x, screenPos.y, size * 2
    );
    
    gradient.addColorStop(0, color1);
    gradient.addColorStop(0.5, color2);
    gradient.addColorStop(1, color3);
    
    // Draw colored glow
    this.ctx.fillStyle = gradient;
    this.ctx.beginPath();
    this.ctx.arc(screenPos.x, screenPos.y, size * 2, 0, Math.PI * 2);
    this.ctx.fill();
    
    // Draw pulsing white center
    const pulse = 0.8 + Math.sin(time * 4) * 0.2;
    this.ctx.fillStyle = `rgba(255, 255, 255, ${pulse})`;
    this.ctx.beginPath();
    this.ctx.arc(screenPos.x, screenPos.y, size * 0.3, 0, Math.PI * 2);
    this.ctx.fill();
    
    // Draw light bulb emoji
    this.ctx.font = `${size}px Arial`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText('💡', screenPos.x, screenPos.y);
    
    this.ctx.restore();
  }

  /**
   * Render light bulb with rainbow cycling effect (legacy)
   */
  private renderRainbowLightBulb(screenPos: Vec2, size: number): void {
    this.ctx.save();
    
    const time = Date.now() * 0.0008; // Much slower rainbow cycling speed
    
    // Create rainbow gradient
    const gradient = this.ctx.createRadialGradient(
      screenPos.x, screenPos.y, 0,
      screenPos.x, screenPos.y, size * 2
    );
    
    // Rainbow colors cycling
    const hue1 = (time * 60) % 360;
    const hue2 = (hue1 + 60) % 360;
    const hue3 = (hue2 + 60) % 360;
    
    gradient.addColorStop(0, `hsl(${hue1}, 100%, 70%)`);
    gradient.addColorStop(0.5, `hsl(${hue2}, 100%, 60%)`);
    gradient.addColorStop(1, `hsl(${hue3}, 100%, 50%)`);
    
    // Draw rainbow glow
    this.ctx.fillStyle = gradient;
    this.ctx.beginPath();
    this.ctx.arc(screenPos.x, screenPos.y, size * 2, 0, Math.PI * 2);
    this.ctx.fill();
    
    // Draw pulsing white center
    const pulse = 0.8 + Math.sin(time * 4) * 0.2;
    this.ctx.fillStyle = `rgba(255, 255, 255, ${pulse})`;
    this.ctx.beginPath();
    this.ctx.arc(screenPos.x, screenPos.y, size * 0.3, 0, Math.PI * 2);
    this.ctx.fill();
    
    // Draw light bulb emoji
    this.ctx.font = `${size}px Arial`;
    this.ctx.textAlign = 'center';
    this.ctx.textBaseline = 'middle';
    this.ctx.fillText('💡', screenPos.x, screenPos.y);
    
    this.ctx.restore();
  }

  /**
   * Render light effect around player when they have light bulbs
   */
  private renderPlayerLightEffect(playerPos: Vec2, camera: Camera, lightBulbCount: number, isResting: boolean): void {
    this.ctx.save();
    
    const time = Date.now() * 0.0005; // Much slower cycling for player effect
    const screenPos = worldToScreen(playerPos, camera);
    
    // Adjust radius based on resting state (50% when resting)
    const baseRadius = isResting ? 40 : 80;
    const radius = baseRadius + (lightBulbCount * (isResting ? 10 : 20));
    
    // Create rainbow gradient around player
    const gradient = this.ctx.createRadialGradient(
      screenPos.x, screenPos.y, 0,
      screenPos.x, screenPos.y, radius
    );
    
    // Rainbow colors cycling
    const hue1 = (time * 40) % 360;
    const hue2 = (hue1 + 120) % 360;
    
    gradient.addColorStop(0, `rgba(255, 255, 255, 0)`);
    gradient.addColorStop(0.3, `hsla(${hue1}, 80%, 60%, 0.3)`);
    gradient.addColorStop(0.7, `hsla(${hue2}, 80%, 50%, 0.3)`);
    gradient.addColorStop(1, `rgba(255, 255, 255, 0)`);
    
    // Draw light aura
    this.ctx.fillStyle = gradient;
    this.ctx.beginPath();
    this.ctx.arc(screenPos.x, screenPos.y, 80 + (lightBulbCount * 20), 0, Math.PI * 2);
    this.ctx.fill();
    
    // Add sparkles around the player
    for (let i = 0; i < lightBulbCount * 3; i++) {
      const angle = (time * 2 + i * (360 / (lightBulbCount * 3))) % 360;
      const distance = 60 + Math.sin(time * 3 + i) * 10;
      const sparkleX = screenPos.x + Math.cos(angle * Math.PI / 180) * distance;
      const sparkleY = screenPos.y + Math.sin(angle * Math.PI / 180) * distance;
      
      const sparkleHue = (hue1 + i * 30) % 360;
      this.ctx.fillStyle = `hsla(${sparkleHue}, 100%, 70%, 0.3)`;
      this.ctx.beginPath();
      this.ctx.arc(sparkleX, sparkleY, 2, 0, Math.PI * 2);
      this.ctx.fill();
    }
    
    this.ctx.restore();
  }

  /**
   * Render colored light effects around player based on their light bulb inventory
   */
  private renderPlayerColoredLightEffects(playerPos: Vec2, camera: Camera, inventory: any, isResting: boolean): void {
    this.ctx.save();
    
    const screenPos = worldToScreen(playerPos, camera);
    const time = Date.now() * 0.0005;
    
    
    // Get only COLORED light bulbs from inventory (white bulbs don't create visual auras)
    const coloredLightBulbTypes = [
      'Light Bulb Red', 'Light Bulb Green', 'Light Bulb Blue', 
      'Light Bulb Orange', 'Light Bulb Purple', 'Light Bulb Rainbow',
      // Fallback for lowercase versions
      'Light Bulb red', 'Light Bulb green', 'Light Bulb blue',
      'Light Bulb orange', 'Light Bulb purple', 'Light Bulb rainbow'
    ];
    
    let totalLightBulbs = 0;
    const bulbCounts: { [key: string]: number } = {};
    
    // Count each type of COLORED light bulb (white bulbs don't create visual auras)
    for (const bulbType of coloredLightBulbTypes) {
      const count = inventory.items.get(bulbType) || 0;
      if (count > 0) {
        bulbCounts[bulbType] = count;
        totalLightBulbs += count;
      }
    }
    
    if (totalLightBulbs === 0) {
      this.ctx.restore();
      return;
    }
    
    // Adjust radius based on resting state and total bulbs
    const baseRadius = isResting ? 40 : 80;
    const radius = baseRadius + (totalLightBulbs * (isResting ? 10 : 20));
    
    
    // Create layered light effects based on bulb types
    for (const [bulbType, count] of Object.entries(bulbCounts)) {
      if (count === 0) continue;
      
      // Create gradient based on bulb type
      const gradient = this.ctx.createRadialGradient(
        screenPos.x, screenPos.y, 0,
        screenPos.x, screenPos.y, radius
      );
      
      let color1, color2, color3;
      switch (bulbType) {
        case 'Light Bulb Red':
          color1 = 'rgba(255, 100, 100, 0.3)';
          color2 = 'rgba(255, 50, 50, 0.2)';
          color3 = 'rgba(255, 0, 0, 0.1)';
          break;
        case 'Light Bulb Green':
          color1 = 'rgba(100, 255, 100, 0.3)';
          color2 = 'rgba(50, 255, 50, 0.2)';
          color3 = 'rgba(0, 255, 0, 0.1)';
          break;
        case 'Light Bulb Blue':
          color1 = 'rgba(100, 100, 255, 0.3)';
          color2 = 'rgba(50, 50, 255, 0.2)';
          color3 = 'rgba(0, 0, 255, 0.1)';
          break;
        case 'Light Bulb Orange':
          color1 = 'rgba(255, 165, 0, 0.3)';
          color2 = 'rgba(255, 140, 0, 0.2)';
          color3 = 'rgba(255, 100, 0, 0.1)';
          break;
        case 'Light Bulb Purple':
          color1 = 'rgba(200, 100, 255, 0.3)';
          color2 = 'rgba(150, 50, 200, 0.2)';
          color3 = 'rgba(100, 0, 150, 0.1)';
          break;
        case 'Light Bulb Rainbow':
        case 'Light Bulb rainbow':
          // Rainbow cycling effect (subtle background only)
          const hue1 = (time * 40) % 360;
          const hue2 = (hue1 + 60) % 360;
          const hue3 = (hue2 + 60) % 360;
          color1 = `hsla(${hue1}, 80%, 60%, 0.3)`;
          color2 = `hsla(${hue2}, 80%, 50%, 0.2)`;
          color3 = `hsla(${hue3}, 80%, 40%, 0.1)`;
          break;
        case 'Light Bulb red':
          color1 = 'rgba(255, 100, 100, 0.3)';
          color2 = 'rgba(255, 50, 50, 0.2)';
          color3 = 'rgba(255, 0, 0, 0.1)';
          break;
        case 'Light Bulb green':
          color1 = 'rgba(100, 255, 100, 0.3)';
          color2 = 'rgba(50, 255, 50, 0.2)';
          color3 = 'rgba(0, 255, 0, 0.1)';
          break;
        case 'Light Bulb blue':
          color1 = 'rgba(100, 100, 255, 0.3)';
          color2 = 'rgba(50, 50, 255, 0.2)';
          color3 = 'rgba(0, 0, 255, 0.1)';
          break;
        case 'Light Bulb orange':
          color1 = 'rgba(255, 165, 0, 0.3)';
          color2 = 'rgba(255, 140, 0, 0.2)';
          color3 = 'rgba(255, 100, 0, 0.1)';
          break;
        case 'Light Bulb purple':
          color1 = 'rgba(200, 100, 255, 0.3)';
          color2 = 'rgba(150, 50, 200, 0.2)';
          color3 = 'rgba(100, 0, 150, 0.1)';
          break;
        default:
          color1 = 'rgba(255, 255, 255, 0.4)';
          color2 = 'rgba(255, 255, 255, 0.3)';
          color3 = 'rgba(255, 255, 255, 0.2)';
      }
      
      gradient.addColorStop(0, color1);
      gradient.addColorStop(0.5, color2);
      gradient.addColorStop(1, color3);
      
      // Draw light aura for this bulb type
      this.ctx.fillStyle = gradient;
      this.ctx.beginPath();
      this.ctx.arc(screenPos.x, screenPos.y, radius, 0, Math.PI * 2);
      this.ctx.fill();
      
      // Add sparkles for each bulb of this type
      for (let i = 0; i < count; i++) {
        const angle = (time * 2 + i * (360 / count)) % 360;
        const distance = 60 + Math.sin(time * 3 + i) * 10;
        const sparkleX = screenPos.x + Math.cos(angle * Math.PI / 180) * distance;
        const sparkleY = screenPos.y + Math.sin(angle * Math.PI / 180) * distance;
        
        // Use appropriate sparkle color
        if (bulbType === 'Light Bulb Rainbow' || bulbType === 'Light Bulb rainbow') {
          const sparkleHue = ((time * 40) + i * 30) % 360;
          this.ctx.fillStyle = `hsla(${sparkleHue}, 100%, 70%, 0.8)`;
        } else {
          this.ctx.fillStyle = color1.replace('0.3)', '0.8)');
        }
        
        this.ctx.beginPath();
        this.ctx.arc(sparkleX, sparkleY, 3, 0, Math.PI * 2);
        this.ctx.fill();
      }
    }
    
    this.ctx.restore();
  }

  /**
   * Render mounted art car on top of everything else
   */
  private renderMountedArtCarOnTop(artCar: any, camera: Camera): void {
    this.ctx.save();
    
    // Render the art car with enhanced visibility
    this.renderArtCarsWithDesigns([artCar], camera);
    
    // Add extra glow to make it stand out
    this.renderArtCarGlow([artCar], camera);
    
    this.ctx.restore();
  }

  /**
   * Render art car auras at night
   */
  private renderArtCarAuras(artCars: any[], camera: Camera): void {
    if (!artCars) return;
    
    const time = Date.now() * 0.001;
    
    for (const car of artCars) {
      const carScreenPos = worldToScreen(car.pos, camera);
      const auraRadius = 80 * car.size; // Scale aura with car size
      
      // Create pulsing aura effect
      const pulseIntensity = 0.6 + Math.sin(time * 2 + car.id.charCodeAt(0)) * 0.3;
      const auraGradient = this.ctx.createRadialGradient(
        carScreenPos.x, carScreenPos.y, 0,
        carScreenPos.x, carScreenPos.y, auraRadius
      );
      
      // Different aura colors based on car design
      let auraColor = '#FFD700'; // Default gold
      switch (car.design) {
        case 'fire':
          auraColor = '#FF4500'; // Orange-red
          break;
        case 'alien':
          auraColor = '#00FF00'; // Green
          break;
        case 'davinci':
          auraColor = '#8B4513'; // Brown
          break;
        case 'octopus':
          auraColor = '#FF69B4'; // Hot pink
          break;
        case 'heavy':
          auraColor = '#C0C0C0'; // Silver
          break;
        case 'speedy':
          auraColor = '#00BFFF'; // Deep sky blue
          break;
        case 'compact':
          auraColor = '#FFA500'; // Orange
          break;
        case 'classic':
          auraColor = '#FFD700'; // Gold
          break;
      }
      
      // Convert hex to rgba for gradient
      const r = parseInt(auraColor.slice(1, 3), 16);
      const g = parseInt(auraColor.slice(3, 5), 16);
      const b = parseInt(auraColor.slice(5, 7), 16);
      
      auraGradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${pulseIntensity * 0.6})`);
      auraGradient.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, ${pulseIntensity * 0.3})`);
      auraGradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
      
      this.ctx.fillStyle = auraGradient;
      this.ctx.fillRect(
        carScreenPos.x - auraRadius,
        carScreenPos.y - auraRadius,
        auraRadius * 2,
        auraRadius * 2
      );
      
      // Add some sparkle effects around the aura
      for (let i = 0; i < 5; i++) {
        const sparkleAngle = (time * 2 + i * Math.PI * 2 / 5) % (Math.PI * 2);
        const sparkleDistance = auraRadius * 0.8;
        const sparkleX = carScreenPos.x + Math.cos(sparkleAngle) * sparkleDistance;
        const sparkleY = carScreenPos.y + Math.sin(sparkleAngle) * sparkleDistance;
        const sparkleSize = 2 + Math.sin(time * 4 + i) * 1;
        const sparkleOpacity = pulseIntensity * 1.0;
        
        this.ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${sparkleOpacity})`;
        this.ctx.beginPath();
        this.ctx.arc(sparkleX, sparkleY, sparkleSize, 0, Math.PI * 2);
        this.ctx.fill();
      }
    }
  }

  /**
   * Render weather effects (rain, lightning, etc.)
   */
  renderWeatherEffects(gameState: any, camera: Camera): void {
    const weather = gameState.weather;
    if (!weather || weather.duration <= 0) return;

    this.ctx.save();

    if (weather.type === 'thunderstorm') {
      this.renderThunderstormEffects(weather, camera);
    }

    this.ctx.restore();
  }

  /**
   * Render thunderstorm effects (rain and lightning)
   */
  private renderThunderstormEffects(weather: any, camera: Camera): void {
    const time = Date.now() * 0.001;
    const canvasWidth = this.canvas.width;
    const canvasHeight = this.canvas.height;
    const intensity = weather.intensity;

    // Render rain
    this.renderRain(intensity, time, canvasWidth, canvasHeight);

    // Render lightning flashes
    this.renderLightning(intensity, time, canvasWidth, canvasHeight);
  }

  /**
   * Render rain effect with improved animation
   */
  private renderRain(intensity: number, time: number, canvasWidth: number, canvasHeight: number): void {
    const rainDrops = Math.floor(5 + intensity * 10); // 5-15 raindrops per frame based on intensity
    this.ctx.lineWidth = 1;

    for (let i = 0; i < rainDrops; i++) {
      const speed = Math.random() * 10;
      const color = `rgb(${Math.floor(150 - speed * 8)}, ${Math.floor(150 - speed * 8)}, ${Math.floor(150 - speed * 8)})`;
      
      const x = Math.random() * canvasWidth;
      const y = -50;
      const size = Math.floor(Math.random() * 20 + 3);

      this.ctx.strokeStyle = color;
      this.ctx.beginPath();
      this.ctx.moveTo(x, y);
      this.ctx.lineTo(x, y + size);
      this.ctx.stroke();
    }

    // Animate existing rain drops (this would need to be stored in a rain list for proper animation)
    // For now, we'll create new drops each frame which gives a good rain effect
  }

  /**
   * Render lightning flashes with advanced branching system
   */
  private renderLightning(intensity: number, time: number, canvasWidth: number, canvasHeight: number): void {
    // Lightning occurs randomly but more frequently with higher intensity
    const lightningChance = intensity * 0.02; // 0-2% chance per frame
    const shouldFlash = Math.random() < lightningChance;

    if (shouldFlash) {
      // Create lightning flash effect
      const flashIntensity = 0.3 + intensity * 0.7;
      
      // White flash overlay
      this.ctx.fillStyle = `rgba(255, 255, 255, ${flashIntensity * 0.3})`;
      this.ctx.fillRect(0, 0, canvasWidth, canvasHeight);

      // Draw advanced lightning bolt
      this.renderAdvancedLightningBolt(canvasWidth, canvasHeight, intensity);
    }
  }

  /**
   * Render an advanced branching lightning bolt
   */
  private renderAdvancedLightningBolt(canvasWidth: number, canvasHeight: number, intensity: number): void {
    const startX = Math.random() * canvasWidth;
    const startY = -50;
    
    // Create lightning branch
    const branch = new LightningBranch(this.ctx, intensity, startX, startY, canvasWidth, canvasHeight);
    branch.process();
  }
}

/**
 * Advanced lightning branch system adapted from the provided code
 */
class LightningBranch {
  private ctx: CanvasRenderingContext2D;
  private intensity: number;
  private startX: number;
  private startY: number;
  private canvasWidth: number;
  private canvasHeight: number;
  private path: Array<{x: number, y: number, endX: number, endY: number}>;
  private size: number;
  private subBranches: LightningBranch[];

  constructor(ctx: CanvasRenderingContext2D, intensity: number, x: number, y: number, canvasWidth: number, canvasHeight: number) {
    this.ctx = ctx;
    this.intensity = intensity;
    this.startX = x;
    this.startY = y;
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    
    // Initialize path with first segment
    this.path = [{
      x: x,
      y: y,
      endX: (0.5 - Math.random()) * (canvasHeight / 10) + x,
      endY: (0.7 - Math.random()) * (canvasWidth / 20) + y
    }];
    
    this.size = Math.floor(intensity * 10) + Math.floor(Math.random() * 10);
    this.subBranches = [];
  }

  process(): boolean {
    let ready = true;

    // Continue building the lightning path
    if (this.path.length < this.size) {
      for (let i = 0; i < 3; i++) {
        const lastSegment = this.path[this.path.length - 1];
        this.path.push({
          x: lastSegment.endX,
          y: lastSegment.endY,
          endX: (0.5 - Math.random()) * (this.canvasHeight / 10) + lastSegment.endX,
          endY: Math.random() * (this.canvasWidth / 30) + lastSegment.endY
        });

        // Create sub-branches based on intensity
        if (Math.random() < this.intensity / 10) {
          const lastPoint = this.path[this.path.length - 1];
          this.subBranches.push(new LightningBranch(
            this.ctx, 
            this.intensity / 2, 
            lastPoint.x, 
            lastPoint.y, 
            this.canvasWidth, 
            this.canvasHeight
          ));
        }
      }
      ready = false;
    }

    // Draw the lightning path
    this.ctx.strokeStyle = `rgba(255, 255, 255, ${0.8 + this.intensity * 0.2})`;
    this.ctx.lineWidth = this.intensity * 0.2 + 1;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';

    for (let i = 0; i < this.path.length; i++) {
      this.ctx.beginPath();
      this.ctx.moveTo(this.path[i].x, this.path[i].y);
      this.ctx.lineTo(this.path[i].endX, this.path[i].endY);
      this.ctx.stroke();
    }

    // Process sub-branches
    for (let i = 0; i < this.subBranches.length; i++) {
      this.subBranches[i].process();
    }

    return ready;
  }
}
