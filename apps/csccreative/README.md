# CSC Creative Studio

A desktop-first Phase 1 prototype for non-destructive creative production. It supports projects, original asset preservation, canvas-based recomposition, conversational mock revisions, version history, and production-format exports.

## Architecture

- `src/app`: Next.js App Router shell
- `src/components`: modular dashboard, workspace, canvas, controls, and shared UI
- `src/hooks`: project state and persistence orchestration
- `src/lib`: domain types, presets, IndexedDB storage, and browser image processing
- `src/services`: swappable image provider and future asset repository contracts

Prototype project and blob data are stored in the browser's IndexedDB. Source assets are immutable; every resize or mock revision writes a new blob and version record. Mock mode runs locally without credentials; a Phase 2 image provider will be added behind a server-side Cloudflare Worker endpoint so model credentials never enter the browser.

## Run

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. No API key is required in the default `mock` mode.
For LAN-based development, add the requesting hostname to `ALLOWED_DEV_ORIGINS`.

To create the static bundle served at `palmharborai.com/csccreative`, run `npm run build:static`.

## Phase 1 workflow

Create project → upload creative → choose dimensions → create version or send an instruction → restore a prior version → export PNG/JPG/WEBP.

PDF files are retained non-destructively but show a placeholder in this phase. AI-based semantic editing, reference libraries, brand management, batch resizing, and the Logo Exporter remain intentionally sequenced for later phases.
