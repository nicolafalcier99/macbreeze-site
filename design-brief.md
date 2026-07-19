# MacBreeze section brief — read before writing your section

**Voice:** confident, plain, short sentences. Apple-marketing register, not hype-speak.
No exclamation-point copy, no "revolutionary", no emoji in body text.

**Style system:** link `tokens.css` and reuse its variables/classes
(`.btn-primary`, `.btn-ghost`, `.card`, `--space-*`, `--radius-*`) instead of
inventing new colors, spacing, or button styles. If you need something
tokens.css doesn't cover, add it scoped inside your own section's CSS file —
never edit `tokens.css` itself.

**Output contract:**
- You own exactly one pair of files: `sections/<your-name>.html` +
  `sections/<your-name>.css`. Do not touch `index.html`, `style.css`,
  `script.js`, or any other agent's `sections/*` files.
- `sections/<your-name>.html` contains ONLY your `<section>` (or `<header>`/
  `<footer>` where noted) element and its contents — no `<html>`/`<head>`/
  `<body>` wrapper.
- `sections/<your-name>.css` contains ONLY selectors scoped to your section
  (prefix classes with your section name if there's any chance of collision,
  e.g. `.pricing-card` not `.card-featured`).
- Keep every "locked fact" from the plan's Global Constraints section
  exactly as stated — you may rewrite wording, reorder, restructure, but
  never change a number, threshold, or claim.
- Keep any shared JS hook classes/ids listed in Global Constraints exactly
  as named — script.js is not yours to edit, and it selects elements by
  these exact names.
- When done, verify your file has no leftover placeholder text and commit
  in your own worktree branch.
