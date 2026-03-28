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
- **AI difficulty:** Easy / Medium / Hard (3 levels, selected on PlacementPhase)
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

## Game Flow
```
TitleScreen (SETUP)
  → commander name + action buttons only; no difficulty picker here
  → "Place Ships" button navigates to placement

PlacementPhase (PLACEMENT)
  → DifficultyPicker at top of side column (Easy/Medium/Hard)
  → ShipDock + rotation/auto-place/clear below
  → "Start Battle" in a fixed bottom bar on ≤1023px viewports
    (phase gets extra bottom padding so content isn't hidden behind it)

BattlePhase (BATTLE)
  → opponent board top/left, player board bottom/right
  → shot log hidden on small/short viewports (see breakpoints below)

ResultsPhase (RESULTS)
```

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
inherited value as the grid cells. Uses `useLayoutEffect` + `ResizeObserver` +
`orientationchange` + `visualViewport resize` to stay in sync on rotation and when
mobile browser chrome changes height. Falls back gracefully in jsdom.

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

### TitleScreen layout
- Background hero image uses `background-size: contain` + navy letterboxing (no crop).
- Portrait (phones): hero strip on top, panel below (column layout).
- Landscape / ≥600px wide: hero and panel side-by-side (row layout).
- Extra rules for landscape + short height (phones in landscape).

### Actual Playwright device viewports
Playwright's reported `page.viewportSize()` differs from advertised device specs:
- `Pixel 5` → 393×727 (not 851px — browser chrome subtracted)
- `iPhone SE` → 320×568 (1st gen, not 375×667)
- `iPhone 14` → webkit, passes with 28px cells
- `Galaxy S21` → 360×800, covered by ≤389px breakpoint

## PWA / Orientation
- PWA manifest `orientation` is set to `"landscape"` in `vite.config.ts` — installed
  app opens in landscape on Android/Chrome (iOS support partial).
- A normal browser tab cannot be forced to rotate; needs Screen Orientation API
  (requires fullscreen + user gesture) or Capacitor's native orientation plugin.
- Icons generated via `npm run generate-icons` (requires `sharp`)
- Service worker: Workbox generateSW mode via vite-plugin-pwa
- Manifest at `dist/manifest.webmanifest` after build

## Test Structure
```
tests/
  unit/          — pure logic (coordinates, game engine, AI)
  integration/   — React components with jsdom (PlacementPhase, BattlePhase, gameStore)
  e2e/           — Playwright, 7 device targets (chromium, firefox, pixel-5, iphone-se,
                   iphone-14, galaxy-s21, ipad)
```

E2E flow: difficulty is selected on **PlacementPhase** (not title screen).
`battle-easy.spec.ts` clicks Easy on placement before auto-placing ships.
`responsive.spec.ts` uses `scrollIntoViewIfNeeded` before checking Start Battle
visibility to handle tall desktop layouts.

Integration tests produce `HTMLMediaElement.prototype.play` errors in stderr — these are
expected (jsdom doesn't support audio) and do not cause test failures.

## Project Structure
```
src/
  audio/         — SoundManager (singleton)
  components/
    grid/        — GridBoard, GridCell, GridCoordinates, GridShip
    layout/      — AppShell (header + main wrapper)
    phases/      — TitleScreen, PlacementPhase, BattlePhase, ResultsPhase
    ship/        — ShipDock, ShipToken
    ui/          — Button, DifficultyPicker, HealthBar, ShotLog
  constants/     — game enums, ship definitions, grid size
  hooks/         — useCellSize
  logic/         — ship placement validation, AI strategies
  models/        — TypeScript types
  store/         — Zustand gameStore
  styles/        — tokens.css (CSS custom properties)
```
