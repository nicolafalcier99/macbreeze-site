# MacBreeze Site Renewal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild the MacBreeze marketing site (`/Users/nick/macbreeze-site`) from its current dark theme to a new Apple-clean light design with rewritten copy, using 10 parallel Sonnet 5 subagents for section-level work plus 3 main-thread coordination tasks, without any agent touching a shared file another agent is also editing.

**Architecture:** Main thread writes a shared style/content contract first (Task 1). Ten subagents then build the site as self-contained fragment files (7 section HTML+CSS pairs, 1 image pass, 1 accessibility pass, 1 responsive pass) inside isolated git worktrees, so no two agents ever write to the same file. Main thread splices the section fragments into the real `index.html`/`style.css` (Task 10) and applies the two post-merge patches (Task 13).

**Tech Stack:** Static HTML/CSS/vanilla JS, no build step, no framework, no test runner. GitHub Pages hosting via GitHub Actions (deploy stays out of scope for this plan — see Global Constraints).

## Global Constraints

Spec: `docs/superpowers/specs/2026-07-19-macbreeze-site-renewal-design.md` — read it before starting Task 1.

- **Pricing (do not change):** Pro $15 (one Mac, forever). 4-pack $45 (4 Macs).
- **Feature/tier split (do not change):** Per-app automation — Free: 1 automation + 2 profile slots; Pro: unlimited + priority ordering. Visual fan curves — Pro only. Auto-Blast safety net — Free, always; caps at 95°C, runs full speed until cooled to 85°C. Power-aware AC/battery switching — Pro only. Full sensor monitoring (CPU/GPU/battery/per-core/energy) — Free, always. Universal Apple Silicon support incl. fanless MacBook Air/Neo (monitoring-only, free) — always.
- **FAQ facts (do not change):** privileged helper install (one click, one password prompt) needed for fan control only, not monitoring. Trial ends → drops to Free tier, Pro extras locked not deleted. License is one-Mac-at-a-time by default and free to move; permanent offline link to one Mac exists but is irreversible. Fanless Macs get free monitoring-only view. Requires macOS 14 Sonoma+, Apple Silicon.
- **`.buy-link` and `.download-link` stay non-functional placeholders.** No agent wires up a real or fake checkout/download link. Leave `script.js`'s existing `TODO(payment-provider)` handlers untouched.
- **Shared JS hooks — every section must keep these exact selectors** (script.js depends on them, script.js is not touched by any section task):
  - `#year` (footer)
  - `.reveal`, `.d1`–`.d5`, `.in` (scroll-reveal — any element wanting the effect keeps these classes)
  - `.faq-item[data-state]`, `.faq-trigger[aria-expanded]` (accordion)
  - `.buy-link[data-product]`, `.download-link` (placeholder buttons)
- **Fixed anchor IDs** (nav targets, do not rename): `id="features"`, `id="faq"`, `id="pricing"`.
- **Style system:** background `#fafafa`, text `#111`, accent `#0071e3`, font stack `-apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", Arial, sans-serif`. Use `tokens.css` custom properties (Task 1) — don't hardcode new colors/spacing.
- **Motion:** keep `.reveal` fade/slide-up system as-is. Keep `blur-text` and `rotating-text` (recolor for light background). Do **not** bring back `border-glow` or `spotlight-card` — both are being retired.
- **Responsive:** extend the existing breakpoints (900px / 760px / 600px), don't invent new ones.
- **Model:** every dispatched subagent runs Sonnet 5.
- **Git:** commit locally is fine once a task's deliverable is verified. Nobody pushes to `origin/main` or triggers deploy — that needs a separate explicit ask.
- **Note on current working directory:** `index.html`/`style.css`/`script.js`/`images/dashboard.png` have uncommitted edits from an earlier, now-superseded dark-theme redesign attempt, and there are untracked `border-glow.*`/`spotlight-card.*`/`blur-text.*`/`rotating-text.*`/`privacy.html` files. Worktrees created below branch from the last **commit** (`0c36277`), so they will NOT see those uncommitted edits — that's intentional, it gives every task a clean base. The old uncommitted files are left alone in the main working directory; nobody deletes them as part of this plan.

---

## File Structure

New files this plan creates:
- `tokens.css` — shared design tokens + base component classes (Task 1)
- `design-brief.md` — voice/tone + output contract handed to every section agent (Task 1)
- `sections/nav-hero.html` + `sections/nav-hero.css` (Task 2)
- `sections/features.html` + `sections/features.css` (Task 3)
- `sections/showcase.html` + `sections/showcase.css` (Task 4)
- `sections/pricing.html` + `sections/pricing.css` (Task 5)
- `sections/compare.html` + `sections/compare.css` (Task 6)
- `sections/faq.html` + `sections/faq.css` (Task 7)
- `sections/footer.html` + `sections/footer.css` (Task 8)

Existing files this plan modifies in place:
- `images/dashboard.png`, `images/app-profiles.png`, possibly a new favicon (Task 9)
- `privacy.html` (Task 8, whole-file rewrite — nothing else touches this file)
- `index.html`, `style.css` (Task 10 splices fragments in; Task 13 applies Task 11/12 patches)

Untouched by this plan: `script.js` (only referenced, never edited — see Global Constraints hooks).

---

### Task 1: Design tokens + brief (main thread, not a subagent)

**Files:**
- Create: `tokens.css`
- Create: `design-brief.md`

**Interfaces:**
- Produces: CSS custom properties and base classes (`--color-bg`, `--color-text`, `--color-accent`, `--font-sans`, `--space-1`…`--space-8`, `--radius-sm/md/lg/pill`, `--shadow-card`, `.btn`/`.btn-primary`/`.btn-ghost`, `.card`) that every later task consumes by linking `tokens.css` and reusing these classes/variables instead of inventing new ones.

- [ ] **Step 1: Write `tokens.css`**

```css
:root {
  /* Colors */
  --color-bg: #fafafa;
  --color-bg-elevated: #ffffff;
  --color-text: #111111;
  --color-text-secondary: #666666;
  --color-text-tertiary: #999999;
  --color-border: #eaeaea;
  --color-accent: #0071e3;
  --color-accent-hover: #0077ed;
  --color-accent-contrast: #ffffff;

  /* Type */
  --font-sans: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Helvetica Neue", Arial, sans-serif;
  --font-size-hero: clamp(2.5rem, 5vw + 1rem, 4.5rem);
  --font-size-h2: clamp(1.75rem, 3vw + 1rem, 2.75rem);
  --font-size-h3: 1.25rem;
  --font-size-body: 1.0625rem;
  --font-size-small: 0.875rem;
  --letter-spacing-tight: -0.02em;

  /* Spacing scale */
  --space-1: 4px;
  --space-2: 8px;
  --space-3: 16px;
  --space-4: 24px;
  --space-5: 40px;
  --space-6: 64px;
  --space-7: 96px;
  --space-8: 140px;

  /* Radii + shadow */
  --radius-sm: 8px;
  --radius-md: 14px;
  --radius-lg: 20px;
  --radius-pill: 999px;
  --shadow-card: 0 1px 2px rgba(0,0,0,0.04), 0 8px 24px rgba(0,0,0,0.06);
}

body {
  background: var(--color-bg);
  color: var(--color-text);
  font-family: var(--font-sans);
  letter-spacing: var(--letter-spacing-tight);
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 12px 24px;
  border-radius: var(--radius-pill);
  font-size: var(--font-size-small);
  font-weight: 600;
  text-decoration: none;
  transition: background-color 0.15s ease, border-color 0.15s ease;
  cursor: pointer;
  border: 1px solid transparent;
}
.btn-primary { background: var(--color-accent); color: var(--color-accent-contrast); }
.btn-primary:hover { background: var(--color-accent-hover); }
.btn-ghost { background: transparent; color: var(--color-text); border-color: var(--color-border); }
.btn-ghost:hover { border-color: var(--color-text-tertiary); }
.btn-block { display: flex; width: 100%; }

.card {
  background: var(--color-bg-elevated);
  border: 1px solid var(--color-border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-card);
  padding: var(--space-4);
}
```

- [ ] **Step 2: Write `design-brief.md`**

```markdown
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
```

- [ ] **Step 3: Commit**

```bash
cd /Users/nick/macbreeze-site
git add tokens.css design-brief.md
git commit -m "Add shared design tokens and section brief for site renewal"
```

---

### Task 2: Nav + Hero section

**Files:**
- Worktree: `../macbreeze-site-nav-hero` on branch `renewal/nav-hero`
- Create: `sections/nav-hero.html`, `sections/nav-hero.css`

**Interfaces:**
- Consumes: `tokens.css`, `design-brief.md` (Task 1)
- Produces: a `<header>` with brand mark + nav linking to `#features`, `#faq`, `#pricing`, and a hero `<section>` with `id="hero"` — consumed by Task 10 (integration)

**Current copy to rewrite (facts, not wording, are locked):** headline "You'll never think about your fans again", subhead about watching CPU/GPU/battery and managing fans automatically, CTAs "Get MacBreeze — $15" (`.buy-link` style) and "See how it works" (`href="#features"`), note "macOS 14 Sonoma or later · Apple Silicon", hero image `images/dashboard.png` (alt: "MacBreeze dashboard showing CPU, GPU, Wi-Fi, battery, and energy readouts, plus live temperature-to-speed curves for both fans").

- [ ] **Step 1: Create worktree**

```bash
cd /Users/nick/macbreeze-site
git worktree add ../macbreeze-site-nav-hero -b renewal/nav-hero
```

- [ ] **Step 2: Write `sections/nav-hero.html`** in the worktree — a `<header class="nav">` with brand + nav (`#features`, `#faq`, `#pricing`), and a `<section id="hero">` with headline, subhead, primary CTA (`href="#pricing" class="btn btn-primary"` — a real anchor down to the pricing section, **not** a `.buy-link`; the actual purchase buttons live in Task 5's pricing cards), secondary CTA (`class="btn btn-ghost" href="#features"`), the Sonoma/Apple Silicon note, and `<img src="images/dashboard.png" class="reveal">` with the alt text above.

- [ ] **Step 3: Write `sections/nav-hero.css`** — layout/spacing for the nav bar and hero using `tokens.css` variables and `.btn`/`.card` base classes.

- [ ] **Step 4: Verify required hooks are present**

```bash
cd /Users/nick/macbreeze-site-nav-hero
grep -q 'href="#features"' sections/nav-hero.html && \
grep -q 'href="#faq"' sections/nav-hero.html && \
grep -q 'href="#pricing"' sections/nav-hero.html && \
! grep -q 'buy-link' sections/nav-hero.html && \
echo "HOOKS OK" || echo "HOOKS MISSING (or a stray .buy-link snuck into the hero — remove it, only pricing cards are buy-links)"
```
Expected: `HOOKS OK`

- [ ] **Step 5: Commit**

```bash
cd /Users/nick/macbreeze-site-nav-hero
git add sections/nav-hero.html sections/nav-hero.css
git commit -m "Add renewed nav + hero section"
```

---

### Task 3: Features grid section

**Files:**
- Worktree: `../macbreeze-site-features` on branch `renewal/features`
- Create: `sections/features.html`, `sections/features.css`

**Interfaces:**
- Consumes: `tokens.css`, `design-brief.md`
- Produces: `<section id="features">` with 6 feature cards, consumed by Task 10

**Locked content (6 cards, facts only — rewrite wording freely):**
1. Per-app automation — assign a profile to any app, auto-switches on launch/quit. Free: 1 automation + 2 profile slots. Pro: unlimited.
2. Visual fan curves — Pro only. Drag points on a live temp→speed graph, responds to CPU/GPU/battery in real time.
3. Auto-Blast safety net — Free, always. Locks fans at full speed if things get too hot, smooth ease-down once safe.
4. Power-aware profiles — Pro only. Quiet on battery, aggressive on AC, switches automatically on plug/unplug.
5. Full sensor monitoring — Free, always. CPU, GPU, battery, per-core temps, live energy draw, in the menu bar.
6. Works on every Apple Silicon Mac — detects hardware automatically, including fanless MacBook Air/Neo.

- [ ] **Step 1: Create worktree**

```bash
cd /Users/nick/macbreeze-site
git worktree add ../macbreeze-site-features -b renewal/features
```

- [ ] **Step 2: Write `sections/features.html`** — `<section id="features">` with a heading and a grid of 6 `.card` elements (add `.reveal .d1`–`.d3` classes cycling per card as the current site does), each covering exactly one locked fact above. Mark Pro-only cards with a small "Pro" tag element.

- [ ] **Step 3: Write `sections/features.css`** — grid layout using `tokens.css` spacing/radius variables.

- [ ] **Step 4: Verify hooks + fact coverage**

```bash
cd /Users/nick/macbreeze-site-features
grep -c 'class="card' sections/features.html
```
Expected: `6`

```bash
grep -qi 'unlimited' sections/features.html && echo "Pro unlimited mentioned" || echo "CHECK: Pro tiers may be missing"
```
Expected: `Pro unlimited mentioned` — the 95°C/85°C Auto-Blast threshold isn't required in this card, that detail lives in the FAQ (Task 7).

- [ ] **Step 5: Commit**

```bash
cd /Users/nick/macbreeze-site-features
git add sections/features.html sections/features.css
git commit -m "Add renewed features grid section"
```

---

### Task 4: Showcase section

**Files:**
- Worktree: `../macbreeze-site-showcase` on branch `renewal/showcase`
- Create: `sections/showcase.html`, `sections/showcase.css`

**Interfaces:**
- Consumes: `tokens.css`, `design-brief.md`
- Produces: `<section id="app-profiles">` (or a new id — this section isn't a nav target, may be renamed), consumed by Task 10

**Locked content:** pick a profile per app (Premiere Pro, DaVinci Resolve, Photoshop, etc.), switches automatically on launch/quit, no manual toggling. Free includes 1 active app automation; Pro unlocks unlimited with priority ordering. Image: `images/app-profiles.png` (alt: "MacBreeze automatically switching to a per-app fan profile the moment an app launches").

- [ ] **Step 1: Create worktree**

```bash
cd /Users/nick/macbreeze-site
git worktree add ../macbreeze-site-showcase -b renewal/showcase
```

- [ ] **Step 2: Write `sections/showcase.html`** — text block + `<img src="images/app-profiles.png" class="reveal">` with the alt text above, covering both locked facts (auto-switch behavior, Free-vs-Pro automation limit).

- [ ] **Step 3: Write `sections/showcase.css`**.

- [ ] **Step 4: Verify**

```bash
cd /Users/nick/macbreeze-site-showcase
grep -q 'app-profiles.png' sections/showcase.html && echo "IMAGE REF OK" || echo "IMAGE REF MISSING"
```

- [ ] **Step 5: Commit**

```bash
cd /Users/nick/macbreeze-site-showcase
git add sections/showcase.html sections/showcase.css
git commit -m "Add renewed showcase section"
```

---

### Task 5: Pricing section

**Files:**
- Worktree: `../macbreeze-site-pricing` on branch `renewal/pricing`
- Create: `sections/pricing.html`, `sections/pricing.css`

**Interfaces:**
- Consumes: `tokens.css`, `design-brief.md`
- Produces: `<section id="pricing">` with 2 price cards, consumed by Task 10

**Locked content:** Pro — $15, one Mac forever, includes full monitoring/manual control/Auto-Blast, sensor curves, unlimited profiles, unlimited per-app automations with priority ordering, power-aware switching, custom overheat threshold, 14-day free trial no card required. 4-pack — $45, everything in Pro, up to 4 Macs at once.

- [ ] **Step 1: Create worktree**

```bash
cd /Users/nick/macbreeze-site
git worktree add ../macbreeze-site-pricing -b renewal/pricing
```

- [ ] **Step 2: Write `sections/pricing.html`** — `<section id="pricing">`, two `.card` elements. Pro card's CTA: `<a href="#" class="btn btn-primary buy-link" data-product="single">`. 4-pack card's CTA: `<a href="#" class="btn btn-ghost buy-link" data-product="pack4">`.

- [ ] **Step 3: Write `sections/pricing.css`**.

- [ ] **Step 4: Verify**

```bash
cd /Users/nick/macbreeze-site-pricing
grep -q 'data-product="single"' sections/pricing.html && \
grep -q 'data-product="pack4"' sections/pricing.html && \
grep -q '\$15' sections/pricing.html && \
grep -q '\$45' sections/pricing.html && \
echo "PRICING HOOKS OK" || echo "PRICING HOOKS MISSING"
```
Expected: `PRICING HOOKS OK`

- [ ] **Step 5: Commit**

```bash
cd /Users/nick/macbreeze-site-pricing
git add sections/pricing.html sections/pricing.css
git commit -m "Add renewed pricing section"
```

---

### Task 6: Compare table section

**Files:**
- Worktree: `../macbreeze-site-compare` on branch `renewal/compare`
- Create: `sections/compare.html`, `sections/compare.css`

**Interfaces:**
- Consumes: `tokens.css`, `design-brief.md`
- Produces: `<section id="compare">` with a Free-vs-Pro table, consumed by Task 10

**Locked content — exact Free/Pro values for each row (rewrite labels/layout freely, values must match):**
| Row | Free | Pro |
|---|---|---|
| Full sensor monitoring & menu bar readout | yes | yes |
| Fanless Mac experience | yes | yes |
| Manual fan control | yes | yes |
| Blast mode & Auto-Blast safety net | yes | yes |
| Profiles | 2 slots | Unlimited |
| Per-app automations | 1 active | Unlimited |
| Visual sensor curves | no | yes |
| Power-aware AC / battery profiles | no | yes |
| Overheat notifications, custom threshold | no | yes |

- [ ] **Step 1: Create worktree**

```bash
cd /Users/nick/macbreeze-site
git worktree add ../macbreeze-site-compare -b renewal/compare
```

- [ ] **Step 2: Write `sections/compare.html`** — `<section id="compare">` with the 9 rows above, using yes/no indicators (dots, checkmarks, or text — agent's choice) plus the two text-value rows (`2 slots`/`Unlimited`, `1 active`/`Unlimited`).

- [ ] **Step 3: Write `sections/compare.css`**.

- [ ] **Step 4: Verify row count**

```bash
cd /Users/nick/macbreeze-site-compare
grep -c 'compare-row\|<tr' sections/compare.html
```
Expected: `9` (or `10` if a header row is included) — if it doesn't match, a row was dropped or merged and needs fixing before commit.

- [ ] **Step 5: Commit**

```bash
cd /Users/nick/macbreeze-site-compare
git add sections/compare.html sections/compare.css
git commit -m "Add renewed compare table section"
```

---

### Task 7: FAQ section

**Files:**
- Worktree: `../macbreeze-site-faq` on branch `renewal/faq`
- Create: `sections/faq.html`, `sections/faq.css`

**Interfaces:**
- Consumes: `tokens.css`, `design-brief.md`
- Produces: `<section id="faq">` with 5 accordion items, consumed by Task 10. **Must reuse the existing accordion markup contract exactly** since `script.js` drives it and is not being edited:

```html
<div class="faq-item" data-state="closed">
  <h3 class="faq-trigger-wrap">
    <button type="button" class="faq-trigger" aria-expanded="false">
      <span>Question text</span>
      <span class="faq-icon" aria-hidden="true"><!-- icon --></span>
    </button>
  </h3>
  <div class="faq-content-wrap">
    <div class="faq-content-inner">
      <p>Answer text.</p>
    </div>
  </div>
</div>
```

**Locked content (5 Q&A, facts only):**
1. Admin access? — needs a privileged helper (one click, one password prompt) for fan control; monitoring alone needs no special access.
2. Safe to let an app control fans? — yes, safety cap 95°C, Auto-Blast runs full speed until cooled to 85°C, included for every user.
3. After trial ends? — drops to Free tier (monitoring, manual control, Auto-Blast keep working; 2 profile slots, 1 active automation kept but Pro extras locked, not deleted, unlock instantly on purchase).
4. Move license to new Mac? — one Mac at a time, moving is free (just sign in, needs to be online to check in); optional permanent offline link to one Mac is available but irreversible (moving after that means buying Pro again).
5. Works on MacBook Air / fanless Neo? — yes, auto-detects fanless Macs, switches to monitoring-only view, fully free on those machines.

- [ ] **Step 1: Create worktree**

```bash
cd /Users/nick/macbreeze-site
git worktree add ../macbreeze-site-faq -b renewal/faq
```

- [ ] **Step 2: Write `sections/faq.html`** — `<section id="faq">`, 5 items using the exact markup contract above, one per locked Q&A.

- [ ] **Step 3: Write `sections/faq.css`** — restyle only, don't touch the grid-rows height-transition mechanism (`.faq-content-wrap` grid-template-rows trick) since `script.js` toggles `data-state` and CSS handles the resulting transition.

- [ ] **Step 4: Verify hooks**

```bash
cd /Users/nick/macbreeze-site-faq
grep -c 'class="faq-item"' sections/faq.html
```
Expected: `5`

```bash
grep -c 'aria-expanded="false"' sections/faq.html
```
Expected: `5`

- [ ] **Step 5: Commit**

```bash
cd /Users/nick/macbreeze-site-faq
git add sections/faq.html sections/faq.css
git commit -m "Add renewed FAQ section"
```

---

### Task 8: Footer + privacy page

**Files:**
- Worktree: `../macbreeze-site-footer` on branch `renewal/footer`
- Create: `sections/footer.html`, `sections/footer.css`
- Modify (whole-file rewrite, in the worktree): `privacy.html`

**Interfaces:**
- Consumes: `tokens.css`, `design-brief.md`
- Produces: `<footer>` with `id="year"` span, consumed by Task 10; rewritten `privacy.html` is a standalone page, not consumed by anyone else.

**Locked content:** brand mark, copyright line "© `<span id="year"></span>` MacBreeze. Built for MacBook.", links to `privacy.html` and `mailto:support@example.com`.

- [ ] **Step 1: Create worktree**

```bash
cd /Users/nick/macbreeze-site
git worktree add ../macbreeze-site-footer -b renewal/footer
```

- [ ] **Step 2: Write `sections/footer.html`** — `<footer>` containing `<span id="year"></span>` inside the copyright line, plus the privacy/support links above.

- [ ] **Step 3: Write `sections/footer.css`**.

- [ ] **Step 4: Rewrite `privacy.html`** in place to match the new tokens/style (light background, same font stack), keeping its existing legal text content — read the current file first (`privacy.html` in the worktree) before rewriting so no legal content is dropped.

- [ ] **Step 5: Verify**

```bash
cd /Users/nick/macbreeze-site-footer
grep -q 'id="year"' sections/footer.html && echo "YEAR HOOK OK" || echo "YEAR HOOK MISSING"
grep -q 'tokens.css' privacy.html && echo "PRIVACY LINKS TOKENS" || echo "CHECK privacy.html stylesheet link"
```

- [ ] **Step 6: Commit**

```bash
cd /Users/nick/macbreeze-site-footer
git add sections/footer.html sections/footer.css privacy.html
git commit -m "Add renewed footer section and restyle privacy page"
```

---

### Task 9: Asset prep

**Files:**
- Worktree: `../macbreeze-site-assets` on branch `renewal/assets`
- Modify: `images/dashboard.png`, `images/app-profiles.png`
- Create (optional, if none exists): a favicon file

**Interfaces:**
- Consumes: nothing from other tasks (only touches `images/`, zero overlap with any HTML/CSS task)
- Produces: same-path optimized images, consumed visually by Task 2 (`nav-hero.html` references `images/dashboard.png`) and Task 4 (`showcase.html` references `images/app-profiles.png`) — filenames must not change

- [ ] **Step 1: Create worktree**

```bash
cd /Users/nick/macbreeze-site
git worktree add ../macbreeze-site-assets -b renewal/assets
```

- [ ] **Step 2: Check current image sizes**

```bash
cd /Users/nick/macbreeze-site-assets
ls -la images/
```

- [ ] **Step 3: Optimize both screenshots for a lighter page** (compress without visibly degrading quality — e.g. `sips` or `pngquant` if available; keep the same filenames and roughly the same aspect ratio so the fixed alt text and layout assumptions in Tasks 2/4 still hold).

- [ ] **Step 4: Confirm a favicon exists or add one** — check `index.html`'s current `<head>` (in main repo, for reference only, don't edit it from this worktree) for a `<link rel="icon">`; if none exists, add a simple favicon file consistent with the brand-dot mark. Note the exact filename in the commit message so Task 10 knows the `<link>` tag to add.

- [ ] **Step 5: Verify file paths unchanged**

```bash
cd /Users/nick/macbreeze-site-assets
test -f images/dashboard.png && test -f images/app-profiles.png && echo "PATHS OK" || echo "PATHS CHANGED — fix before commit"
```

- [ ] **Step 6: Commit**

```bash
cd /Users/nick/macbreeze-site-assets
git add images/
git commit -m "Optimize screenshots for renewed site, add favicon"
```

---

### Task 10: Integration (main thread, not a subagent)

**Files:**
- Modify: `index.html`, `style.css`

**Interfaces:**
- Consumes: all 7 fragment pairs from Tasks 2–8, optimized images + favicon from Task 9
- Produces: a fully merged `index.html`/`style.css` on `main`, consumed by Task 11 and Task 12

- [ ] **Step 1: Merge each worktree branch's fragment files back to `main`** (no conflicts expected — every branch only adds new files under `sections/`, plus Task 8 which also modifies `privacy.html` alone)

```bash
cd /Users/nick/macbreeze-site
git merge renewal/nav-hero renewal/features renewal/showcase renewal/pricing renewal/compare renewal/faq renewal/footer renewal/assets --no-edit
```

- [ ] **Step 2: Confirm all fragment files landed**

```bash
ls sections/
```
Expected: `nav-hero.html nav-hero.css features.html features.css showcase.html showcase.css pricing.html pricing.css compare.html compare.css faq.html faq.css footer.html footer.css`

- [ ] **Step 3: Rewrite `index.html`** — new `<head>` linking `tokens.css` plus every `sections/*.css` file (drop the old `border-glow.css`/`spotlight-card.css` links, keep `blur-text.css`/`rotating-text.css`, add the favicon link from Task 9), and a `<body>` that inserts each fragment's HTML content verbatim in this order: nav-hero, features, showcase, pricing, compare, faq, footer. Keep the existing `<script>` tags for `script.js`, `blur-text.js`, `rotating-text.js`; drop the `border-glow.js`/`spotlight-card.js` tags.

- [ ] **Step 4: Verify every Global Constraint hook survived the splice**

```bash
cd /Users/nick/macbreeze-site
grep -q 'id="year"' index.html && \
grep -q 'id="features"' index.html && \
grep -q 'id="faq"' index.html && \
grep -q 'id="pricing"' index.html && \
grep -c 'class="faq-item"' index.html | grep -q 5 && \
grep -q 'data-product="single"' index.html && \
grep -q 'data-product="pack4"' index.html && \
echo "ALL HOOKS OK" || echo "HOOK MISSING — check output above"
```
Expected: `ALL HOOKS OK`

- [ ] **Step 5: Visual check** — confirm live-server (already running on `127.0.0.1:8000`) reflects the new page; open it and check: page loads with no console errors, FAQ accordion opens/closes, both buy buttons show the placeholder alert, hero/showcase images load, footer year is correct.

- [ ] **Step 6: Commit**

```bash
cd /Users/nick/macbreeze-site
git add index.html style.css
git commit -m "Integrate renewed sections into index.html"
```

---

### Task 11: Accessibility pass

**Files:**
- Worktree: `../macbreeze-site-a11y` on branch `renewal/a11y`, branched from `main` **after** Task 10's commit
- Modify: `index.html`, `style.css` (or per-section files under `sections/`, agent's choice, as long as the diff is reviewable)

**Interfaces:**
- Consumes: merged `index.html`/`style.css` from Task 10
- Produces: a patch reviewed and applied by Task 13

- [ ] **Step 1: Create worktree from the post-integration commit**

```bash
cd /Users/nick/macbreeze-site
git worktree add ../macbreeze-site-a11y -b renewal/a11y main
```

- [ ] **Step 2: Audit and fix** semantic HTML (correct heading levels, landmark elements), color contrast against the new `#fafafa`/`#111`/`#0071e3` palette (WCAG AA — 4.5:1 for body text, 3:1 for large text/UI), alt text completeness, `aria-*` correctness on the FAQ accordion and nav.

- [ ] **Step 3: Verify no locked fact or shared hook was altered while fixing accessibility**

```bash
cd /Users/nick/macbreeze-site-a11y
grep -q 'id="year"' index.html && grep -q 'class="faq-item"' index.html && grep -q 'data-product="single"' index.html && echo "HOOKS INTACT" || echo "HOOK BROKEN"
```

- [ ] **Step 4: Commit**

```bash
cd /Users/nick/macbreeze-site-a11y
git add -A
git commit -m "Accessibility pass on renewed site"
```

---

### Task 12: Responsive/mobile pass

**Files:**
- Worktree: `../macbreeze-site-responsive` on branch `renewal/responsive`, branched from `main` **after** Task 10's commit (same base as Task 11, independent of it)
- Modify: `index.html`, `style.css` (or per-section files, agent's choice)

**Interfaces:**
- Consumes: merged `index.html`/`style.css` from Task 10
- Produces: a patch reviewed and applied by Task 13 alongside Task 11's patch

- [ ] **Step 1: Create worktree from the post-integration commit**

```bash
cd /Users/nick/macbreeze-site
git worktree add ../macbreeze-site-responsive -b renewal/responsive main
```

- [ ] **Step 2: Check and fix layout at the existing breakpoints** (900px / 760px / 600px) for every section — nav collapse, hero stacking, feature grid column count, pricing cards stacking, compare table horizontal scroll or reflow, FAQ spacing.

- [ ] **Step 3: Verify hooks intact** (same check as Task 11 Step 3).

- [ ] **Step 4: Commit**

```bash
cd /Users/nick/macbreeze-site-responsive
git add -A
git commit -m "Responsive pass on renewed site"
```

---

### Task 13: Final reconciliation (main thread, not a subagent)

**Files:**
- Modify: `index.html`, `style.css`

**Interfaces:**
- Consumes: Task 11 and Task 12 patches
- Produces: final verified state on `main`

- [ ] **Step 1: Merge both patch branches**

```bash
cd /Users/nick/macbreeze-site
git merge renewal/a11y --no-edit
git merge renewal/responsive --no-edit
```
If both branches touched the same lines (e.g. both adjusted the same media query), resolve manually — accessibility fixes (contrast, aria, alt text) take priority over layout tweaks; re-verify the layout still works at all 3 breakpoints after resolving.

- [ ] **Step 2: Re-run the hook verification from Task 10 Step 4** to confirm nothing regressed.

- [ ] **Step 3: Final visual check** in the browser (live-server on `127.0.0.1:8000`) across desktop width and the 3 breakpoints.

- [ ] **Step 4: Clean up worktrees**

```bash
cd /Users/nick/macbreeze-site
git worktree remove ../macbreeze-site-nav-hero
git worktree remove ../macbreeze-site-features
git worktree remove ../macbreeze-site-showcase
git worktree remove ../macbreeze-site-pricing
git worktree remove ../macbreeze-site-compare
git worktree remove ../macbreeze-site-faq
git worktree remove ../macbreeze-site-footer
git worktree remove ../macbreeze-site-assets
git worktree remove ../macbreeze-site-a11y
git worktree remove ../macbreeze-site-responsive
git branch -d renewal/nav-hero renewal/features renewal/showcase renewal/pricing renewal/compare renewal/faq renewal/footer renewal/assets renewal/a11y renewal/responsive
```

- [ ] **Step 5: Commit final state**

```bash
cd /Users/nick/macbreeze-site
git add -A
git commit -m "Finalize site renewal: merge accessibility and responsive passes"
```

**Do not push to `origin/main`.** Deploy is a separate, explicit decision per Global Constraints.
