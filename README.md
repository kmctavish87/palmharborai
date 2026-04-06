# palmharborai.com

palmharborai.com is a static homepage for a beginner-friendly AI website focused on:

- explaining AI topics simply
- recommending useful AI tools
- showing practical AI project examples for small businesses

The site is built with plain HTML, CSS, and JavaScript only. It requires no framework, no build step, and is compatible with Cloudflare Pages.

## Files

- `index.html`
- `styles.css`
- `script.js`
- `README.md`

## Local Preview

Open `index.html` directly in a browser, or serve the folder with any simple static server.

## Deploy To Cloudflare Pages

1. Push this repository to GitHub.
2. In Cloudflare, go to `Workers & Pages`.
3. Click `Create application`.
4. Choose `Pages`.
5. Connect your Git repository.
6. Use these deployment settings:

- Build command: `none`
- Output directory: `/`

Because this is a plain static site, Cloudflare Pages can serve the files directly from the root of the repository.

## Notes

- No `node_modules` are required for deployment.
- No build step is required.
- The site is mobile responsive and ready for static hosting.
