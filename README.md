# palmharborai.com

palmharborai.com is a static consulting website for a solo AI and automation consultant focused on mid-market B2B companies.

## Positioning

The site is built to speak to:

- marketing leaders
- revenue leaders
- CIOs

Core service areas:

- AI consulting
- marketing automation
- demand generation systems
- revenue operations optimization

## Site Structure

- `index.html` - Homepage
- `services.html` - Services
- `TMS/index.html` - TMS Research & News Intelligence Hub
- `solutions.html` - Use Cases / Solutions
- `about.html` - About
- `insights.html` - Insights / Blog
- `contact.html` - Contact / Book a Call
- `styles.css` - Shared design system and page styling
- `script.js` - Mobile nav, reveal animations, and contact form placeholder behavior
- `functions/api/tms/*` - Server-side routes for the TMS hub
- `functions/_lib/*` - Shared TMS fetch, dedupe, and database logic
- `migrations/001_create_tms_tables.sql` - D1 schema for TMS data

## Stack

- Plain HTML
- Plain CSS
- Plain JavaScript
- No framework
- No build step

This makes the site easy to deploy on static hosting and straightforward to port into Webflow, Next.js, or another platform later.

## TMS Research & News Intelligence Hub

Route:

- `/TMS`

What it includes:

- searchable split-screen hub for TMS medical studies and TMS-related news
- server-side study aggregation from PubMed / NCBI E-utilities and Europe PMC
- modular news aggregation with NewsAPI support and RSS fallback
- D1-backed storage for `tms_studies`, `tms_news_articles`, and refresh logs
- AI draft generation for selected studies and articles
- manual protected refresh endpoint at `/api/tms/refresh`
- scheduled refresh workflow every 15 days via GitHub Actions

### Environment Variables

Create environment variables locally and in Cloudflare:

- `OPENAI_API_KEY`
- `NEWS_API_KEY`
- `NCBI_API_KEY`
- `EUROPE_PMC_API_KEY` (optional placeholder for future expansion)
- `TMS_ADMIN_TOKEN`

See `.env.example`.

### Database Setup

This implementation uses Cloudflare D1.

1. Create a D1 database in Cloudflare.
2. Replace `REPLACE_WITH_D1_DATABASE_ID` in `wrangler.jsonc`.
3. Apply the schema in `migrations/001_create_tms_tables.sql`.

If you use Wrangler locally, the usual pattern is:

```bash
wrangler d1 execute palmharborai-tms --remote --file=./migrations/001_create_tms_tables.sql
```

### Refreshing TMS Data

Manual admin refresh endpoint:

- `POST /api/tms/refresh`
- required header: `x-admin-token: <TMS_ADMIN_TOKEN>`

Example:

```bash
curl -X POST https://palmharborai.com/api/tms/refresh \
  -H "x-admin-token: YOUR_ADMIN_TOKEN"
```

Scheduled refresh:

- `.github/workflows/tms-refresh.yml`
- runs on the 1st and 16th of each month, which approximates a 15-day refresh cadence
- requires the GitHub Actions secret `TMS_ADMIN_TOKEN`

### AI Content Generation Notes

- the AI generator only sends selected source metadata and summaries to the API
- OpenAI keys stay server-side
- generated content is designed to use careful language and include source references
- the output includes an educational disclaimer and is not medical advice

## Local Preview

Open `index.html` directly in a browser, or serve the directory with any simple static server.

## Deploy To Cloudflare Pages

1. Push this repository to GitHub.
2. In Cloudflare, go to `Workers & Pages`.
3. Create or connect a Pages project.
4. Use these deployment settings:

- Build command: `none`
- Output directory: `/`

## Notes

- The site is mobile responsive.
- The header is sticky and includes the global CTA: `Book a Strategy Call`.
- Subtle scroll-based reveal animations are included.
- The contact page includes a form and a calendar embed placeholder ready to replace with a real booking tool.
- The TMS hub depends on Cloudflare Functions plus D1 configuration to work in production.
