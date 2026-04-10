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
- `solutions.html` - Use Cases / Solutions
- `about.html` - About
- `insights.html` - Insights / Blog
- `contact.html` - Contact / Book a Call
- `styles.css` - Shared design system and page styling
- `script.js` - Mobile nav, reveal animations, and contact form placeholder behavior

## Stack

- Plain HTML
- Plain CSS
- Plain JavaScript
- No framework
- No build step

This makes the site easy to deploy on static hosting and straightforward to port into Webflow, Next.js, or another platform later.

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
