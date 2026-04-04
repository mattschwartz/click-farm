# Click Farm — Client

Vite + React + TypeScript client. Single-player, client-authoritative. Persistence via `localStorage`. No server at launch (see `.frames/sdlc/architecture/core-systems.md`).

## Setup

```bash
cd client
npm install
```

Requires Node.js 20+.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the Vite dev server at http://localhost:5173 with HMR |
| `npm run build` | Type-check (`tsc -b`) and produce a production build in `dist/` |
| `npm test` | Run Vitest once |
| `npm run lint` | Run ESLint |
| `npm run preview` | Serve the production build locally |

## Module layout

`src/` is organized to match the component boundaries in the architecture spec:

| Directory | Responsibility |
|---|---|
| `game-loop/` | Core tick — pure `state → state` function |
| `save/` | Serialize/deserialize game state to/from `localStorage`, with versioned migrations |
| `static-data/` | Balance data (generator stats, platform affinities, algorithm states, upgrade costs, unlock thresholds) |
| `offline/` | Offline gain calculation, walking the seeded Algorithm shift schedule |
| `ui/` | React components — present state, dispatch actions, never mutate game state directly |

The game loop must not import from React. Dependency flows one way: `ui → game-loop`, never reverse.
