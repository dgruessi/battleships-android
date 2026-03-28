# Navy Fury (codebase: Battleships) — Claude Context

## Project Identity
- **Product name:** Navy Fury
- **Repo/folder name:** Battleships
- **Primary channel:** PWA deployed on Vercel (auto-deploy on `git push` to main)
- **Secondary channel:** Native Android (Android Studio installed locally)
  - Hybrid path: wrap with **Capacitor** (`npx cap sync android`) or Cordova → APK/AAB
  - Native path: direct Android modules / Google Play Services (IAP, leaderboards)

## Tech Stack
- React 19 + TypeScript + Vite
- Zustand for state management
- Vitest + React Testing Library (unit/integration)
- Playwright (E2E, multi-device)
- vite-plugin-pwa (service worker, web manifest)

## Game Design Constants
- **Fleet:** 5 ships — sizes 5-4-3-3-2 (carrier, cruiser, destroyer ×2, patrol boat)
- **Grid:** 10×10
- **AI difficulty:** Easy / Medium / Hard (3 levels implemented)
- **Assets:** Visuals/icons via Nano Banana; SFX via ElevenLabs (commercial licence)

## Commands
```bash
npm test                  # unit + integration tests (vitest)
npm run build             # compile TypeScript + bundle (required before E2E)
npx playwright test       # E2E tests — ALWAYS rebuild first (see below)
npm run preview           # serve dist/ for manual testing
git push                  # triggers auto-deployment to Vercel
npx cap sync android      # (if Capacitor added) sync web build into Android Studio
```

## Critical: E2E tests require a fresh build
`playwright.config.ts` sets `reuseExistingServer: true` in dev, so Playwright serves the
**existing `dist/` folder** without rebuilding. CSS/JS changes are invisible to E2E tests
until you run `npm run build`. Always rebuild before running or debugging E2E failures.

## CSS Architecture

### Cell size custom properties
`--cell-size` and `--coord-size` are defined on `:root` in `src/styles/tokens.css` and
**overridden per-component** on `.battle-phase` and `.placement-phase`:

```
:root            → 30–52px (grows with viewport width)
.battle-phase    → 22–44px (responsive overrides in BattlePhase.css)
.placement-phase → 18–24px (responsive overrides in PlacementPhase.css)
```

Descendants (GridBoard, GridCell, GridCoordinates) pick up the component-scoped value.
`useCellSize(gridCellsRef)` takes a ref to the `.grid-cells` element and reads
`getComputedStyle(el).getPropertyValue('--cell-size')`, so ship sprites see the same
inherited value as the grid cells. Uses `useLayoutEffect` + `ResizeObserver` to stay in
sync; falls back gracefully in jsdom (no ResizeObserver).

### Mobile breakpoints (BattlePhase.css)
| Condition | Cell size | Notes |
|---|---|---|
| ≤479px | 28px | Standard mobile |
| ≤479px AND ≤730px | 22px | Covers Pixel 5 (727px) and iPhone SE |
| ≤389px | 22px | Galaxy S21, smaller Androids |
| ≤389px AND ≤580px | 18px | iPhone SE 1st gen (320×568) |
| ≥900px | 44px (row layout) | Desktop side-by-side |

**Rule order matters:** more specific (AND height) breakpoints must come AFTER the
general width-only breakpoints so they win the cascade.

### Actual Playwright device viewports
Playwright's reported `page.viewportSize()` differs from advertised device specs:
- `Pixel 5` → 393×727 (not 851px — browser chrome subtracted)
- `iPhone SE` → 320×568 (1st gen, not 375×667)
- `iPhone 14` → webkit, passes with 28px cells
- `Galaxy S21` → 360×800, covered by ≤389px breakpoint

## Test Structure
```
tests/
  unit/          — pure logic (coordinates, game engine, AI)
  integration/   — React components with jsdom (PlacementPhase, BattlePhase, gameStore)
  e2e/           — Playwright, 7 device targets (chromium, firefox, pixel-5, iphone-se,
                   iphone-14, galaxy-s21, ipad)
```

Integration tests produce `HTMLMediaElement.prototype.play` errors in stderr — these are
expected (jsdom doesn't support audio) and do not cause test failures.

## Project Structure
```
src/
  audio/         — SoundManager (singleton)
  components/
    grid/        — GridBoard, GridCell, GridCoordinates, GridShip
    layout/      — AppShell (header + main wrapper)
    phases/      — PlacementPhase, BattlePhase (one per game phase)
    ship/        — ShipDock, ShipToken
    ui/          — Button, HealthBar, ShotLog
  constants/     — game enums, ship definitions, grid size
  hooks/         — useCellSize
  logic/         — ship placement validation, AI strategies
  models/        — TypeScript types
  store/         — Zustand gameStore
  styles/        — tokens.css (CSS custom properties)
```

## PWA
- Icons generated via `npm run generate-icons` (requires `sharp`)
- Service worker managed by vite-plugin-pwa (Workbox generateSW mode)
- Manifest at `dist/manifest.webmanifest` after build
