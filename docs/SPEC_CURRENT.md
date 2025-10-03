# SPEC_CURRENT.md - Wombat Quest Living Specification

**Generated:** 2025-10-01  
**Source:** `wombatquest.html` (8151 lines, single-file HTML/JS/CSS)  
**Architecture:** Monolithic browser game with inline JavaScript

---

## 1) Public API Surface

This is a **self-contained HTML page** with no formal module exports. The "public API" consists of:

### Global Functions (Window-scoped)

| Function | Signature | Parameters | Return | Purity |
|----------|-----------|------------|--------|--------|
| `nextDialogue()` | `() => void` | none | void | **IMPURE** (DOM mutations, game state) |
| `skipIntro()` | `() => void` | none | void | **IMPURE** (DOM, state changes) |
| `makeChoice(choiceIndex)` | `(number) => void` | choiceIndex: 1-3 | void | **IMPURE** (DOM, stat changes, time advance) |
| `enterPlaya()` | `() => void` | none | void | **IMPURE** (world transition, DOM) |
| `closeModal(modalId?)` | `(string?) => void` | modalId (optional) | void | **IMPURE** (DOM removal) |

### Global Event Handlers (Inline `onclick`)

| Handler | Location | Effect |
|---------|----------|--------|
| `nextDialogue()` | Intro story buttons | Advances narrative |
| `makeChoice(1|2|3)` | Gate ritual choices | Modifies `player.stats`, advances time |
| `enterPlaya()` | Final story button | Hides intro, shows game, starts loop |
| `skipIntro()` | Skip button | Bypasses story, enters game |

### Call Sites

- **`nextDialogue()`**: Called 3× in HTML (lines ~1005, 1017, etc.)
- **`makeChoice()`**: Called 3× in gate ritual scene (lines ~1029-1031)
- **`enterPlaya()`**: Called 1× in final intro button (line ~1042)

---

## 2) Data & Contracts

### Core Domain Types (Inferred TypeScript)

```typescript
// Player State
interface Player {
  worldX: number;
  worldY: number;
  screenX: number;  // Always center
  screenY: number;  // Always center
  w: 32;
  h: 32;
  speed: 6;
  color: string;
  stats: PlayerStats;
  inventory: Record<string, number>;
  flags: { storm: boolean; goggles: boolean };
  time: GameTime;
  inCamp: boolean;
  hasSeenCampDialogue: boolean;
  drugEffects: DrugEffects;
  tripStats: TripStats;
  sleeping: boolean;
  sleepStartTime: number;
  cooldowns: Cooldowns;
  lastActionTimes: Record<string, number>;
}

interface PlayerStats {
  coin: number;       // 0-9999
  karma: number;      // 0-9999
  hunger: number;     // 0-100
  thirst: number;     // 0-100
  energy: number;     // 0-100
  mood: number;       // 0-100
}

interface GameTime {
  day: number;     // 1-11+
  hour: number;    // 0-23
  minute: number;  // 0-59
}

interface DrugEffects {
  activeDrugs: ActiveDrug[];
  timeMultiplier: number;       // 0.01-10.0
  timeStopDuration: number;     // frames remaining
  timeAccumulator: number;
  whipitsCount: number;
}

interface ActiveDrug {
  name: string;
  emoji: string;
  speedMultiplier: number;
  hallucinating: boolean;
  duration: number;  // hours
  startTime: number; // Date.now()
  mysteryType?: string;
  timeMultiplier?: number;
  specialEffects?: string;
}

interface TripStats {
  totalDrugsConsumed: number;
  drugsTried: Set<string>;
  timeHigh: number;        // frames
  totalPlayTime: number;   // frames
  gameStartTime: number;   // Date.now()
  totalDistance: number;   // pixels
  lastX: number;
  lastY: number;
  walkingTime: number;
  bikingTime: number;
  artCarTime: number;
  meditationCount: number;
  highMoodTime: number;
  lowMoodTime: number;
  wellRestedTime: number;
  exhaustedTime: number;
  fastTime: number;
  slowTime: number;
}

interface Cooldowns {
  dance: number;
  climb: number;
  orgy: number;
  chore: number;
  shop: number;
  temple: number;
  man: number;
  homeSpawn: number;  // 15 seconds
}

// World Objects
interface Coin {
  x: number;
  y: number;
  w: 8;
  h: 8;
  collected: boolean;
  chunkId: string;
}

interface WaterBottle {
  x: number;
  y: number;
  w: 12;
  h: 16;
  collected: boolean;
  chunkId: string;
}

interface Snack {
  x: number;
  y: number;
  w: 16;
  h: 16;
  collected: boolean;
  chunkId: string;
  name: string;
  hunger: number;
  color: string;
  emoji: string;
}

interface Drug {
  x: number;
  y: number;
  w: 20;
  h: 20;
  collected: boolean;
  chunkId: string;
  type: string;
  emoji: string;
  speedMultiplier: number;
  duration: number;  // hours
  hallucinating: boolean;
  mysteryType?: string;
  timeMultiplier?: number;
  specialEffects?: string;
  moodBoost?: number;
  energyBoost?: number;
}

interface Bike {
  x: number;
  y: number;
  w: 72;
  h: 44;
  collected: boolean;
  chunkId: string;
  color: string;
}

interface ArtCar {
  x: number;
  y: number;
  w: number;  // varies 80-500
  h: number;  // varies 60-300
  vx: number;
  vy: number;
  color: string;
  name: string;
  design: string;
  weirdMovement: boolean;
  hasPassenger: boolean;
  chunkId: string;
  fuel: number;       // 0-100
  maxFuel: 100;
  flameIntensity: number;  // 0-1
  playerOffset?: { x: number; y: number };
}

interface NPC {
  x: number;
  y: number;
  w: number;
  h: number;
  vx: number;
  vy: number;
  emoji: string;
  name?: string;
  color?: string;
  behavior: 'camp' | 'dance' | 'bike' | 'artcar';
  behaviorTimer: number;
  directionChangeTimer: number;
  hasGasCan: boolean;
  gasCanFuel: number;
  targetArtCar: ArtCar | null;
  karmaReward: number;
  chunkId: string;
  isWombat?: boolean;
}

interface Decoration {
  x: number;
  y: number;
  w: number;
  h: number;
  color: string;
  type: 'art' | 'temple' | 'camp' | 'fence' | 'tent' | 'kitchen' | 'shade';
  name?: string;
  emoji?: string;
  chunkId?: string;
}

interface SpecialLocation {
  x: number;
  y: number;
  w: number;
  h: number;
  type: 'danceFloor' | 'artInstallation' | 'orgyDome' | 'homeCamp' | 'centerCamp' | 'fuelStation';
  emoji: string;
  name: string;
  chunkId: string;
}

interface GameState {
  ended: boolean;
  finalScore: { coins: number; karma: number };
}
```

### Invariants

| Invariant | Where Enforced | Notes |
|-----------|----------------|-------|
| `karma >= 0` | `clamp()` in `applyEff()` (line ~3143) | Max 9999 |
| `coin >= 0` | `clamp()` in `applyEff()` | Max 9999 |
| `hunger in [0,100]` | `clamp()` in `applyEff()` | Stats decay over time |
| `thirst in [0,100]` | `clamp()` in `applyEff()` | Affects mood/energy |
| `energy in [0,100]` | `clamp()` in `applyEff()` | Movement drains it |
| `mood in [0,100]` | `clamp()` in `applyEff()` | Heavily tied to needs |
| `timeMultiplier in [0.01, 10]` | Line ~3536-3541 | Prevents freeze/overflow |
| `day >= 1` | Time advancement logic | Game ends day 11 |
| `player.worldX/Y within PLAYA_RADIUS` | Line ~3891-3897 | 3000px from center |
| `speedMultiplier > 0` | Drug/stat calculations | Prevents negative movement |

---

## 3) State & Side-Effects Map

### Global/Module Variables

| Variable | Type | Mutability | Purpose |
|----------|------|------------|---------|
| `canvas` | HTMLCanvasElement | const (ref mutable) | Main game canvas |
| `ctx` | CanvasRenderingContext2D | const (ref mutable) | Drawing context |
| `camera` | `{x, y}` | mutable | World camera offset |
| `player` | Player | mutable | Core game state |
| `gameState` | GameState | mutable | Win/loss tracking |
| `keys` | `Record<string, boolean>` | mutable | Input state |
| `decorations` | Decoration[] | mutable | World decorations |
| `coins`, `waterBottles`, `snacks`, `drugs` | Array | mutable | Collectibles |
| `bikes`, `artCars`, `npcs` | Array | mutable | Dynamic entities |
| `moop`, `gasolineTanks` | Array | mutable | Special items |
| `danceFloors`, `artInstallations`, `orgyDomes` | Array | mutable | Locations |
| `homeCamps`, `centerCamps`, `fuelStations` | Array | mutable | Key locations |
| `ridingArtCar` | ArtCar | null | mutable | Current art car |
| `ridingBike` | Bike | null | mutable | Current bike |
| `nearbyArtCar`, `nearbyBike` | Object | null | mutable | Proximity detection |
| `mollyHearts` | Array | mutable | Visual effect particles |
| `confetti` | ConfettiParticle[] | mutable | Celebration effect |
| `generatedChunks` | Set<string> | mutable | World gen cache |
| `worldPopulationMultiplier` | number | mutable | Dynamic spawning |
| `lastTimeUpdate` | number | mutable | Date.now() timestamp |
| `lastStatDecay` | number | mutable | Date.now() timestamp |
| `lastAnnouncedDay` | number | mutable | Day announcement tracker |
| `lastDisappearingDay` | number | mutable | Item cleanup tracker |
| `lastExitTime` | number | mutable | Art car cooldown |
| `currentWorld` | 'camp' | 'playa' | mutable | World state |
| `campWorldGenerated`, `playaWorldGenerated` | boolean | mutable | Init flags |
| `gamePaused` | boolean | mutable | Pause state |
| `manStructure`, `templeStructure` | Object | mutable | Event structures |
| `feedbackQueue`, `feedbackContainer` | Array, HTMLElement | mutable | UI feedback |
| `recentPickups` | Record | mutable | Pickup combining |
| `openModals` | Set | mutable | Modal tracking |

### Side Effects

| Effect Type | Where Triggered | Which Functions |
|-------------|-----------------|-----------------|
| **DOM Mutation** | Throughout | `updateStatsDisplay()`, `updateInventoryDisplay()`, `updateTimeDisplay()`, `showCollectionFeedback()`, `showEncounter()`, `endGame()`, `enterPlaya()`, `skipIntro()`, all action handlers |
| **Canvas Rendering** | Every frame | `draw()`, `drawWombat()`, `drawCoins()`, `drawDrugs()`, `drawArtCars()`, `drawNPCs()`, etc. (20+ draw functions) |
| **setTimeout** | Various | `showCollectionFeedback()` (line ~5784), `endGame()` (lines ~1436-1442), drug effects (line ~4064) |
| **setInterval** | None directly | Game loop uses `requestAnimationFrame` |
| **Date.now()** | Every update | `updateDayNightCycle()` (line ~3473), stat decay checks (line ~4112), cooldown timers |
| **Math.random()** | World gen, encounters | `generateWorldContent()`, `doEncounter()`, `pick()`, all spawn logic |
| **localStorage** | None | No persistence |
| **fetch/network** | None | No external requests |
| **Audio** | None | No sound |
| **Event Listeners** | Setup | `keydown/keyup` (lines ~3152, 3468), `resize` (line ~1139), `click` on buttons |

### Side-Effect Attribution

| Export | Triggered Side Effects |
|--------|------------------------|
| `nextDialogue()` | DOM (show/hide scenes), state (dialogue index) |
| `skipIntro()` | DOM (hide intro, show game), calls `enterPlaya()` |
| `makeChoice(n)` | Stats mutation, time advance, DOM (feedback), RNG (choice outcomes) |
| `enterPlaya()` | World generation (RNG), DOM (visibility), state (world transition), starts game loop |
| `loop()` (internal) | Canvas render, `Date.now()`, DOM updates, collision detection, world gen |
| `generateWorldContent()` | RNG (spawning), array mutations (world entities) |
| `updateDayNightCycle()` | `Date.now()`, time advancement, struct updates, DOM |
| `update()` | Movement, collision, stats decay, `Date.now()`, drug effects, NPC AI |
| `actions.*` | Stats, DOM (modals), `Date.now()` (cooldowns), time advance |

---

## 4) Dependency Graph (Condensed)

```
PUBLIC EXPORTS
├─ nextDialogue() → storyState (mutates) → DOM
├─ skipIntro() → enterPlaya()
├─ makeChoice(n) → player.stats → applyEff() → updateStatsDisplay() → advance() → DOM
├─ enterPlaya() → generateWorldContent() → loop() (starts RAF)
└─ closeModal(id) → DOM

GAME LOOP (loop)
├─ update() (physics, AI, collision)
│  ├─ updateDayNightCycle() → advance() → updateStructures() → handlePostBurnDisappearing()
│  ├─ updateArtCars() → collision → fuel system
│  ├─ updateBikes()
│  ├─ updateNPCs() → AI behaviors → gasolineTanks interaction
│  ├─ updateConfetti() → mollyHearts filtering
│  ├─ checkSpecialLocationInteractions() → actions.*
│  ├─ Collection checks (coins, moop, drugs, water, snacks)
│  └─ updateStatsDisplay(), updateInventoryDisplay(), updateDrugEffectsDisplay()
└─ draw() (render all entities)
   ├─ drawBackground(), drawPlaya(), drawTrashFence(), drawManCircle()
   ├─ drawDecorations(), drawCoins(), drawWaterBottles(), drawSnacks()
   ├─ drawBikes(), drawArtCars(), drawNPCs(), drawGasolineTanks()
   ├─ drawDrugs(), drawSpecialLocations(), drawMoop()
   ├─ drawMan(), drawTemple()
   ├─ drawWombat() (player)
   ├─ drawHearts() (molly effect), drawConfetti()
   ├─ drawVignette() (whip-its effect), drawSpeedLines(), drawHallucinations()
   └─ drawCheatOverlay()

WORLD GEN
generateWorldContent()
├─ generateCenterCamp() → centerCamps.push()
├─ generatePlayerHomeBase() → homeCamps.push() → player spawn set
└─ chunk loop (17x17 grid)
   ├─ decorations spawn (RNG)
   ├─ coins spawn (worldPopulationMultiplier)
   ├─ waterBottles, snacks spawn (min rates)
   ├─ artCars spawn (collision checks, fuel system)
   ├─ gasolineTanks spawn (rare)
   ├─ npcs spawn (behaviors: dance, bike, artcar)
   ├─ bikes spawn
   ├─ moop spawn (karma items)
   ├─ drugs spawn (30+ types, time effects)
   └─ danceFloors, artInstallations, orgyDomes, fuelStations spawn

ACTION HANDLERS (actions object)
├─ explore() → doEncounter() → showEncounter() → modal → choice → applyEff()
├─ chore() → RNG (3 types) → stats → advance(30) → showFeedback()
├─ rest() → player.sleeping = true → energy restore loop
├─ shop() → modal → choices → coin check → purchase → stats
├─ help() → modal → options (energy/mood checks) → karma rewards
├─ gift() → inventory check → NPC proximity → karma/mood boost
├─ dance() → modal → energy check → mood/karma → advance(45)
├─ climb() → cooldown check → energy → mood/karma → advance(20)
├─ orgy() → modal → energy/mood check → karma → advance(60)
├─ board() → ridingBike = bike / auto-board artCar
├─ dismount() → ridingBike/ArtCar = null → lastExitTime set
└─ All → updateStatsDisplay(), showCollectionFeedback()

UTILITY HELPERS
├─ clamp(v, min, max) → PURE
├─ rnd(p) → IMPURE (Math.random)
├─ pick(arr) → IMPURE (Math.random)
├─ invPush(name) → player.inventory mutation
├─ useItem(name, effect) → inventory check → applyEff()
├─ applyEff(fn) → player.stats → clamp → updateStatsDisplay()
├─ advance(minutes) → player.time → stat decay → updateTimeDisplay()
├─ isWithinBoundaries(x, y) → PURE (distance check)
└─ resizeCanvas() → canvas dimensions → player.screenX/Y → camera
```

### Hotspots (High Fan-In/Fan-Out)

- **`updateStatsDisplay()`**: Called by 30+ functions (update, actions, purchases, collection)
- **`applyEff()`**: Central stat mutation (all actions, encounters, items)
- **`advance(minutes)`**: Time progression (all actions, encounters)
- **`showCollectionFeedback()`**: UI feedback (20+ collection/action points)
- **`player.stats`**: Read/written by 50+ functions
- **`Date.now()`**: Called 15+ places (cooldowns, time system, trip stats)
- **`Math.random()`**: 100+ calls (world gen, encounters, behaviors)

### Cycles

- **None detected** (no circular function dependencies)
- World gen is one-way: `generateWorldContent()` → arrays
- Update/draw cycle is frame-based (RAF), not recursive

---

## 5) Error Model

### Failure Modes

| Pattern | Usage | Example |
|---------|-------|---------|
| **`alert()`** | User-facing errors | "Not enough coins!" (line ~6054) |
| **`console.log/error`** | Debug/warnings | "WARNING: Time system stuck" (line ~3477) |
| **Silent fail** | Missing checks | No error if `generatedChunks` grows unbounded |
| **Return early** | Guards | `if (gameState.ended) return;` (line ~3688) |
| **Clamping** | Stat overflow | `clamp(v, 0, 100)` everywhere |
| **Null checks** | Optional refs | `if (!feedbackContainer)` (line ~5734) |

### Known Error Types

- **"No [item] left"**: Inventory exhaustion (lines ~5325-5536)
- **"Not enough coins"**: Purchase failures (lines ~6054, 6075)
- **"Not enough energy or mood"**: Action requirements (line ~6138)
- **"WARNING: Time system stuck"**: lastTimeUpdate > 10s (line ~3477)
- **"You need to be at [location]"**: Hotkey location checks (lines ~3215, 3238, 3261, 3284)

### Exception Handling

- **No try/catch blocks** anywhere
- **No error boundaries** (single-file app)
- **No graceful degradation** (canvas assumed to exist)

---

## 6) Performance Notes

### O(n) or Worse

| Operation | Complexity | Location | Notes |
|-----------|------------|----------|-------|
| **Coin collision** | O(n) | `update()` line ~3965 | n = coins array length (~300-3000) |
| **MOOP collision** | O(n) | Line ~3979 | n = moop items (~1000+) |
| **Drug collision** | O(n) | Line ~4001 | n = drugs (~500+) |
| **Water/Snack collision** | O(n) | Lines ~4072, 4085 | n = bottles/snacks |
| **NPC updates** | O(n) | `updateNPCs()` line ~2847 | n = NPCs (~100-500) |
| **Art car collision** | O(n²) | `updateArtCars()` line ~2754 | Each car checks all others |
| **Bike updates** | O(n) | `updateBikes()` line ~2708 | n = bikes |
| **Draw loops** | O(n) | All `draw*()` functions | 10+ arrays iterated per frame |
| **Feedback queue** | O(n) | `updateFeedbackPositions()` line ~5933 | n = active feedbacks |

### Tight Ticks

- **60 FPS loop**: `loop()` calls `update()` → `draw()` → `requestAnimationFrame(loop)` (line ~6815)
- **Every frame**: Collision checks, stat decay, drug effects, NPC AI, canvas clears
- **Every second**: `updateDayNightCycle()` (line ~3481), stat decay (line ~4113)

### Repeated Operations

| Anti-Pattern | Location | Impact |
|--------------|----------|--------|
| **Filter + forEach** | `updateConfetti()` line ~2618 | Recreates array every frame |
| **Array.forEach** | All collision checks | 10+ per frame |
| **JSON.stringify** | None (no persistence) | - |
| **Deep cloning** | None (manual resets) | - |
| **DOM queries** | `updateStatsDisplay()`, `updateInventoryDisplay()` | 10+ `getElementById()` per update |
| **String concatenation** | `showCollectionFeedback()` | Template strings in loops |

### Optimizations Needed

1. **Spatial partitioning**: Use quadtree/grid for collision (currently brute-force O(n²))
2. **Culling**: Only update/draw entities on screen (some functions do this, not all)
3. **Object pooling**: Confetti/hearts create new objects every frame
4. **Batch DOM updates**: Cache `getElementById()` results
5. **Throttle stat decay**: Currently every 3s, could be 5-10s
6. **Chunk unloading**: `generatedChunks` grows indefinitely (memory leak)

---

## 7) Config & Constants

### Magic Numbers

| Value | Location | Proposed Name | Meaning |
|-------|----------|---------------|---------|
| `32` | player.w/h (line ~1151) | `PLAYER_SIZE` | Wombat sprite size |
| `6` | player.speed (line ~1152) | `BASE_PLAYER_SPEED` | Pixels per frame |
| `8151` | File lines | - | Total HTML lines |
| `800` | Line ~2529 | `MAN_CIRCLE_RADIUS` | Yellow line around Man |
| `750` | Line ~2527 | `TEMPLE_DISTANCE` | Distance to Temple |
| `3000` | Line ~2528 | `PLAYA_RADIUS` | Max world boundary |
| `2950` | Line ~2530 | `TRASH_FENCE_RADIUS` | Inner fence radius |
| `400` | Line ~1945 | `CHUNK_SIZE` | World gen chunk size |
| `6000` | Line ~1944 | `WORLD_SIZE` | Total world extent |
| `24` | Line ~2519 | `SECONDS_PER_DAY` | Real-time to game-time |
| `10` | Line ~2522 | `BURNING_MAN_DURATION` | Total event days |
| `7` | Line ~2523 | `MAN_BURN_DAY` | Saturday burn |
| `8` | Line ~2524 | `TEMPLE_BURN_DAY` | Sunday burn |
| `3000` | Line ~4112 | `STAT_DECAY_INTERVAL_MS` | Stat decay frequency |
| `60000` | Line ~6002 | `CHORE_COOLDOWN_MS` | Chore action cooldown |
| `20000` | Line ~4333 | `CLIMB_COOLDOWN_MS` | Climb action cooldown |
| `1000` | Line ~5659 | `PICKUP_COMBINE_TIME_MS` | Feedback combining window |
| `0.1` | Line ~2534 | `INITIAL_POPULATION_MULT` | Day 1 spawn rate |
| `1.0` | Line ~2607 | `PEAK_POPULATION_MULT` | Day 7 spawn rate |
| `0.05` | Line ~3616 | `POST_BURN_POPULATION_MULT` | Day 10+ spawn rate |
| `100` | Various | `STAT_MAX` | Max for hunger/thirst/energy/mood |
| `9999` | Various | `CURRENCY_MAX` | Max coins/karma |

### Magic Strings

| String | Location | Proposed Name |
|--------|----------|---------------|
| `"camp"` | currentWorld (line ~2542) | `WORLD_CAMP` |
| `"playa"` | currentWorld | `WORLD_PLAYA` |
| `"Mystery Pill"` | Line ~2272 | `DRUG_MYSTERY_PILL` |
| `"Mystery Snowball"` | Line ~2274 | `DRUG_MYSTERY_SNOWBALL` |
| `"Whip Its"` | Line ~2294 | `DRUG_WHIP_ITS` |
| `"Boom Boom Womb"` | Line ~2500 | `HOME_CAMP_NAME` |
| `"Center Camp"` | Line ~2472 | `CENTER_CAMP_NAME` |
| `"ArrowUp", "ArrowDown", etc.` | Line ~3829 | `KEY_UP`, `KEY_DOWN`, etc. |

---

## 8) Testability

### Easy to Unit Test (Pure Functions)

| Function | Signature | Why Pure |
|----------|-----------|----------|
| `clamp(v, min, max)` | `(number, number, number) => number` | No side effects |
| `isWithinBoundaries(x, y)` | `(number, number) => boolean` | Pure math (distance check) |

### Need Ports/Adapters (IMPURE)

| Function | Dependencies | Abstraction Needed |
|----------|--------------|-------------------|
| `updateDayNightCycle()` | `Date.now()` | Clock port (inject time provider) |
| `generateWorldContent()` | `Math.random()` | RNG port (seed-based PRNG) |
| `doEncounter()` | `Math.random()`, `pick()` | RNG + encounter factory |
| `applyEff(fn)` | `player.stats`, `updateStatsDisplay()` | State port + observer |
| `advance(minutes)` | `player.time`, `updateTimeDisplay()` | Time port + observer |
| `showCollectionFeedback()` | DOM | UI adapter (mock DOM or event emitter) |
| `updateStatsDisplay()` | DOM (`getElementById`) | UI adapter |
| `loop()` | Canvas, `requestAnimationFrame` | Canvas mock + scheduler |
| All `actions.*` | Multiple (DOM, RNG, state) | Action factory + DI |

### Testing Strategy

1. **Extract pure logic**: Move collision math, stat calculations to separate functions
2. **Inject dependencies**: Pass `clock`, `rng`, `ui` as parameters
3. **Mock DOM**: Use JSDOM or abstract to event emitters
4. **Snapshot tests**: World gen with fixed seed → deterministic output
5. **Integration tests**: Full game loop with fake RAF + time

---

## 9) Extraction Plan (First 3 Slices)

### Module 1: **Core State & Stats** (`core/state.ts`)

**Files to Create:**
- `core/state.ts` (player, game state types)
- `core/stats.ts` (stat mutations, clamping, effects)
- `core/time.ts` (game time, day/night cycle)

**Public Exports:**
```typescript
export interface Player { ... }
export interface PlayerStats { ... }
export interface GameTime { ... }
export interface GameState { ... }

export function clamp(v: number, min: number, max: number): number
export function createPlayer(): Player
export function applyStatEffect(stats: PlayerStats, effect: StatEffect): PlayerStats
export function advanceTime(time: GameTime, minutes: number): GameTime
```

**Dependencies:**
- None (pure data + pure functions)

**What Moves:**
- `player` object definition (lines ~1148-1217)
- `clamp()` (line ~3010)
- `advance()` (line ~3066) → refactor to pure function
- `applyEff()` (line ~3140) → pure stat calculator

**Delegator Stubs (in `wombatquest.html`):**
```javascript
// OLD:
const player = { worldX: 0, worldY: 0, ... };
function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

// NEW (temporary):
import { createPlayer, clamp as coreClamp } from './core/state.js';
const player = createPlayer();
const clamp = coreClamp; // alias for existing calls
```

---

### Module 2: **World Generation** (`world/generation.ts`)

**Files to Create:**
- `world/generation.ts` (chunk-based world gen)
- `world/types.ts` (entity types: Coin, Drug, ArtCar, etc.)
- `world/config.ts` (spawn rates, chunk size)

**Public Exports:**
```typescript
export interface WorldConfig {
  chunkSize: number;
  playaRadius: number;
  populationMultiplier: number;
}

export interface WorldEntities {
  coins: Coin[];
  waterBottles: WaterBottle[];
  drugs: Drug[];
  artCars: ArtCar[];
  // ...
}

export function generateWorldContent(
  config: WorldConfig,
  rng: () => number
): WorldEntities
```

**Dependencies:**
- RNG port (injected `Math.random()` replacement)
- World types (`Coin`, `Drug`, etc.)

**What Moves:**
- `generateWorldContent()` (lines ~1923-2452)
- `generateCenterCamp()`, `generatePlayerHomeBase()`
- All type definitions (Coin, Drug, ArtCar, etc.)
- Spawn logic, `isWithinBoundaries()`

**Delegator Stubs:**
```javascript
// OLD:
function generateWorldContent() { ... }

// NEW:
import { generateWorldContent as genWorld } from './world/generation.js';
const worldEntities = genWorld({ chunkSize: 400, ... }, Math.random);
Object.assign(window, worldEntities); // coins, drugs, etc.
```

---

### Module 3: **Game Loop & Rendering** (`game/loop.ts`, `game/render.ts`)

**Files to Create:**
- `game/loop.ts` (update logic, collision, AI)
- `game/render.ts` (all draw functions)
- `game/input.ts` (keyboard handling)
- `game/camera.ts` (viewport logic)

**Public Exports:**
```typescript
export interface GameContext {
  player: Player;
  entities: WorldEntities;
  camera: Camera;
  input: InputState;
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
}

export function update(ctx: GameContext, dt: number): void
export function render(ctx: GameContext): void
export function startGameLoop(ctx: GameContext): () => void // returns stop fn
```

**Dependencies:**
- State module (Player, GameState)
- World module (WorldEntities)
- Canvas (injected)
- `requestAnimationFrame` (injected scheduler)

**What Moves:**
- `loop()` (line ~6815)
- `update()` (line ~3686)
- All `draw*()` functions (lines ~4457-5200+)
- `updateArtCars()`, `updateNPCs()`, `updateBikes()`
- Input handling (`keydown/up` listeners, lines ~3152, 3468)

**Delegator Stubs:**
```javascript
// OLD:
function loop() { update(); draw(); requestAnimationFrame(loop); }

// NEW:
import { startGameLoop } from './game/loop.js';
const stopGame = startGameLoop({
  player, entities, camera, input, canvas, ctx
});
```

---

### Shared Types (First to Move)

**`shared/types.ts`:**
```typescript
// Common types used across modules
export type Coordinates = { x: number; y: number };
export type Size = { w: number; h: number };
export type AABB = Coordinates & Size;
export type ChunkId = string; // "x,y"
export type StatEffect = Partial<PlayerStats>;
```

**`shared/constants.ts`:**
```typescript
export const PLAYER_SIZE = 32;
export const BASE_PLAYER_SPEED = 6;
export const CHUNK_SIZE = 400;
export const PLAYA_RADIUS = 3000;
export const MAN_CIRCLE_RADIUS = 800;
export const TEMPLE_DISTANCE = 750;
export const BURNING_MAN_DURATION = 10;
export const MAN_BURN_DAY = 7;
export const TEMPLE_BURN_DAY = 8;
export const STAT_MAX = 100;
export const CURRENCY_MAX = 9999;
// ... all magic numbers
```

---

### Migration Steps

1. **Create `docs/` folder** → Add this SPEC
2. **Create `src/shared/`** → Move constants, types
3. **Create `src/core/`** → Extract state, stats (pure functions first)
4. **Update `wombatquest.html`** → Import from `core/`, keep delegators
5. **Test**: Ensure game still runs
6. **Create `src/world/`** → Extract world gen (inject RNG)
7. **Update HTML** → Import world gen, seed RNG for tests
8. **Test**: Verify deterministic world gen
9. **Create `src/game/`** → Extract loop, render
10. **Update HTML** → Minimal entry point, all logic in modules
11. **Test**: Full integration test
12. **Incrementally remove delegators** → Direct imports
13. **Add unit tests** → Jest/Vitest for pure modules
14. **Add integration tests** → Playwright for full game

---

## Summary

**Wombat Quest** is a **monolithic 8000-line browser game** with:
- **No formal exports** (window-scoped functions)
- **Heavy IMPURE logic** (DOM, Canvas, RNG, `Date.now()` everywhere)
- **Global mutable state** (player, arrays, world)
- **O(n²) collision detection** (art cars check all others)
- **60 FPS update loop** with 10+ array iterations per frame
- **Error handling via `alert()` and `console.log`**
- **100+ magic numbers** (chunk size, cooldowns, radii)
- **Testability**: ~2 pure functions (clamp, isWithinBoundaries)

**Immediate Wins:**
1. Extract **constants** → reduce magic numbers
2. Extract **types** → enable TypeScript
3. Extract **pure stat logic** → unit tests
4. Inject **RNG + Clock** → deterministic tests
5. Abstract **DOM** → UI adapter pattern

**Long-term Goal:**
- **3-5 module architecture**: Core (state), World (gen), Game (loop), UI (render), Actions (handlers)
- **DI container** for clock, RNG, canvas
- **100% test coverage** for pure modules
- **Spatial partitioning** for collision (quadtree)
- **Chunk unloading** to prevent memory leaks

---

**End of Spec**
