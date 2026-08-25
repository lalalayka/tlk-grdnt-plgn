# Toloka gradients

A Figma plugin that generates a layered gradient frame (color → white ring → color, softened with a background blur) from a fixed 7-color palette (A–G).

## Using the plugin

1. Set **Width**, **Height** (50–4000px), and a **Gradient** pair (e.g. `A + C`).
2. Click **Generate** — a new frame is created at the center of your current viewport.
3. Selecting a single previously-generated frame and reopening the plugin restores the params it was created with; running Generate again while it's selected creates a new frame alongside it (the original is left untouched).

## Development

Requires Node.js.

```bash
npm install
npm run build   # compiles code.ts -> code.js (one-shot)
npm run watch   # recompiles on every save
```

Then in Figma: **Plugins → Development → Import plugin from manifest…** and select `manifest.json` in this folder. After editing `code.ts`, rebuild and re-run the plugin to pick up the change.

## Project structure

| File | Purpose |
|---|---|
| `manifest.json` | Plugin manifest — points Figma at `code.js` (backend) and `ui.html` (UI). |
| `code.ts` | Plugin backend — runs in Figma's sandbox. Builds the gradient frame, persists per-node settings via plugin data, and messages the UI. Compiles to `code.js` (not committed — see `npm run build`). |
| `ui.html` | Plugin UI — a self-contained HTML/CSS/JS panel shown in a sandboxed iframe, styled against [Figma's official theme CSS variables](https://developers.figma.com/docs/plugins/css-variables/). |
| `colors.json` | The A–G palette as exported Figma design tokens (source of the hex values hardcoded into `code.ts`'s `PALETTE`, not read at runtime). |
| `tsconfig.json` | TypeScript config, typed against `@figma/plugin-typings`. |

## Palette

The 7 colors (A–G) are hardcoded in `code.ts` (`PALETTE`), matching `colors.json`. To change them, update both files' hex values.
