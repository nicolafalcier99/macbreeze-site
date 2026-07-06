# MacBreeze — marketing site

Static landing page for [MacBreeze](https://github.com/nicolafalcier99/MacBreeze), a fan control app for MacBook. Hosted on GitHub Pages — no build step, just plain HTML/CSS/JS.

## Structure

- `index.html` — the whole page (hero, features, pricing, FAQ)
- `style.css` — dark theme matching the app itself
- `script.js` — footer year, FAQ accordion (native `<details>`), placeholder buy/download handlers

## What's still a placeholder

- **Buy buttons** (`.buy-link`) — not wired to a real checkout yet. Once a payment provider (Paddle or Lemon Squeezy) is set up, replace the click handler in `script.js` with the real checkout call/link. See the `TODO(payment-provider)` comment there.
- **Download button** (`.download-link`) — needs a link to an actual signed, notarized release build once one exists.
- **Screenshots** — the hero mockup is hand-drawn CSS/SVG, not a real screenshot. Swap in real app screenshots once available (drop images in an `images/` folder and reference them from `index.html`).
- **Support email** — footer links to a placeholder `mailto:`.

## Local preview

```
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## Deploying changes

Push to `main` — GitHub Pages serves directly from the repo root.
