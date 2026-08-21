# CSC Creative Studio

A desktop-first, non-destructive creative production application served at `palmharborai.com/csccreative`.

## Capabilities

- persistent project workspaces and structured creative briefs
- PNG, JPG, WEBP, SVG, and practical PDF source retention
- conversational local/mock revisions or server-side OpenAI image generation and editing
- single and batch resizing across social, display, email, and custom dimensions
- immutable originals, version lineage, restore, duplicate, rename, and delete
- editable brand profiles for logos, palettes, fonts, messaging, disclaimers, and CTA rules
- private reference library with ownership metadata and explicit project-level selection
- editable Creative Style Profiles derived from selected references
- self-service Logo Exporter with fit, exact-canvas, padding, background, and format controls
- Designer and Standard User experiences
- PNG, JPG, and WEBP export with production filenames

## Architecture

- `src/app`: Next.js App Router shell and metadata
- `src/components`: modular dashboard, workspace, libraries, production tools, and shared UI
- `src/hooks`: project and creative-library persistence orchestration
- `src/lib`: domain types, presets, seeded brand guidance, IndexedDB, and canvas processing
- `src/services`: swappable `ImageProvider` and future `AssetRepository` contracts
- `../../worker/index.js`: server-only OpenAI image endpoint and static-asset routing

Projects, settings, references, brand assets, and image blobs are stored in browser IndexedDB. Source assets are immutable; edits and resizes create new blob/version records. No asset is automatically shared, published, or treated as model-training data.

## Run

```bash
npm install
npm run dev
```

Open `http://localhost:3000`. Local/mock mode requires no API key.

For server-routed local testing, build the static app, copy `out/` to the repository-level `csccreative/` directory, and run Wrangler from the repository root.

```bash
npm run build:static
rsync -a --delete out/ ../../csccreative/
cd ../..
npx wrangler dev
```

## AI configuration

The browser never receives the OpenAI credential. Configure these as Cloudflare secrets:

- `OPENAI_API_KEY` enables `gpt-image-2` generation and editing.
- `CSC_CREATIVE_ACCESS_TOKEN` is required for the hosted OpenAI route. Users enter the matching workspace code in Settings before an OpenAI request.

The provider retries one transient `429`/`5xx` failure and returns user-safe errors. The optional local fallback keeps the project workflow usable if the hosted provider is unavailable.

## Verification

```bash
npm run typecheck
npm run lint
npm run build:static
node --check ../../worker/index.js
```
