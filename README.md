# Wombat Quest - Burning Man Survival Game

A whimsical survival game where you play as a wombat navigating the challenges of Burning Man, from arrival to the final exodus.

## Project Structure

The game has been refactored from a single HTML file into a modular structure:

```
src/
├── shared/
│   ├── constants.ts    # All game constants and magic numbers
│   └── types.ts        # TypeScript type definitions
├── core/
│   └── state.ts        # Pure state management functions
├── world/
│   └── generation.ts   # Procedural world generation
├── game/
│   └── main.ts         # Main game coordination class
└── index.js            # Main entry point

docs/
└── SPEC_CURRENT.md     # Comprehensive specification document
```

## Key Features

- **Procedural World Generation**: Chunk-based system that generates content as you explore
- **Stat Management**: Hunger, thirst, energy, mood, and karma systems
- **Drug Effects**: Various substances with different effects on gameplay
- **Vehicle System**: Bikes and art cars for faster travel
- **NPC Interactions**: Other wombats and burners with different behaviors
- **Time System**: Day/night cycle with Burning Man events (Man Burn, Temple Burn)
- **Trip Report**: End-game summary with archetype generation

## Development

### Running the Game

```bash
# Start a local server
python3 -m http.server 8000

# Or use the npm script
npm start
```

Then open `http://localhost:8000/wombatquest.html` in your browser.

### Testing Modules

Open `http://localhost:8000/test-modules.html` to test the modular system.

## Architecture

The game follows a modular architecture with clear separation of concerns:

- **Shared**: Constants and types used across all modules
- **Core**: Pure functions for state management and calculations
- **World**: Procedural generation of game content
- **Game**: Main coordination and game loop management

## Extraction Plan

This is the first phase of a 3-slice extraction plan:

1. **Slice 1** (Current): Core state management and world generation
2. **Slice 2** (Future): Rendering and UI systems
3. **Slice 3** (Future): Input handling and game mechanics

## Original File

The original `wombatquest.html` file has been updated to use the new modular system while maintaining backward compatibility. The old code is still present but the main game loop now delegates to the new `WombatQuestGame` class.

## Specification

See `docs/SPEC_CURRENT.md` for a comprehensive analysis of the codebase, including:
- Public API surface
- Data contracts and types
- Side effects mapping
- Dependency graph
- Error handling patterns
- Performance analysis
- Testability assessment
- Extraction plan details