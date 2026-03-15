# GameRoom — New Game Checklist

Every new game added to GameRoom should include:

1. **Green felt theme** — use shared CSS vars from `css/shared.css` + `css/game-shared.css` (--bg-primary: #246137, --accent: #f0c040, etc.)
2. **Help/instructions modal** — `<dialog>` element with rules, styled by game-shared.css `.help-modal`
3. **localStorage persistence** — save/restore game state so refresh doesn't lose progress (key: `gameroom-<gamename>`)
4. **Win celebration animation** — import `showWinOverlay`/`hideWinOverlay` from `js/shared/win-animation.js`, include `#win-overlay` div
5. **New Game + Play Again buttons** — standard controls (`#btn-new-game`, `#btn-play-again`)
6. **Responsive sizing** — mobile-friendly with `clamp()`, `vw`/`vh` units, `min()` for max widths
7. **Large, readable fonts** — maximize font sizes to fill available space using `clamp()` and viewport units
8. **ES module** — `<script type="module">`, import shared utilities as needed
9. **Dashboard entry** — add `<game-card>` to main `index.html`
10. **Service worker** — add game files to the `ASSETS` list in `sw.js` and bump `CACHE_NAME` version

## File structure per game
```
games/<game-name>/
  index.html
  <game-name>.css
  <game-name>.js
```

## Shared resources
- `css/shared.css` — base styles, CSS variables, green felt theme
- `css/game-shared.css` — game layout, help modal, win overlay, card styles
- `js/shared/win-animation.js` — win celebration animations (5 types)
- `js/shared/card-engine.js` — card game utilities (re-exports win animations)
- `js/components/game-card.js` — `<game-card>` web component for dashboard
