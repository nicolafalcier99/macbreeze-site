# MacBreeze site renewal — design

## Goal

Full rebuild of the MacBreeze marketing site (`/Users/nick/macbreeze-site`), replacing the current dark-theme design with a new visual direction and rewritten copy. Not a targeted fix — current site (dark theme, React-Bits-ported hover effects, full feature/pricing/FAQ content) is being superseded, though its underlying facts carry forward.

Driver (from user): visual design reads stale, copy/content is weak. Open to full restructure, not just a word-level pass.

## Visual direction: Apple-clean

Chosen via visual companion bake-off (4 directions shown: Apple-clean, Pro dark/technical, Vibrant gradient/glass, Minimal mono premium). Apple-clean won on both browser clicks and terminal confirmation.

Characteristics: light, spacious, huge confident type, one blue accent, product-page energy (apple.com-like). This replaces the current dark theme that was previously chosen to match the app's own UI — that rationale no longer applies.

## Scope: facts locked vs. open

**Locked — no agent may change these facts, only how they're presented:**
- Pricing: Pro $15 (one Mac, forever), 4-pack $45 (4 Macs)
- Feature set and Free/Pro split:
  - Per-app automation — Free: 1 automation, 2 profile slots. Pro: unlimited, priority ordering.
  - Visual fan curves (temp→speed graph) — Pro only.
  - Auto-Blast safety net — Free, always. Target cap 95°C, runs full speed until cooled to 85°C.
  - Power-aware AC/battery profile switching — Pro only.
  - Full sensor monitoring (CPU/GPU/battery/per-core/energy) — Free, always.
  - Universal Apple Silicon support incl. fanless MacBook Air/Neo (monitoring-only, free) — always.
- FAQ facts: needs privileged helper install (one click, one password prompt) for fan control; monitoring alone needs no special access. Safety cap 95°C/85°C. Trial ends → drops to Free tier, Pro extras locked not deleted. License is one-Mac-at-a-time by default, free to move; permanent offline link to one Mac is available but irreversible. Fanless Macs get free monitoring-only view.
- Buy button (`.buy-link`) and download button (`.download-link`) stay non-functional placeholders (see `script.js` `TODO(payment-provider)`) — **no agent wires up a real or fake checkout/download link.**
- macOS 14 Sonoma+, Apple Silicon requirement.

**Open — any agent may change:**
- Section order, structure, which sections exist
- All headlines, body copy, microcopy, tone
- Card/table/pricing layout and visual presentation
- Whether/how each fact above is grouped or sequenced

## Style system (Phase 0 — written by main thread before any agent starts)

Deliverable: `tokens.css` + short `design-brief.md`, both handed identically to every Phase 1 agent so nobody invents their own component style.

- Colors: `#fafafa` background / `#111` text / `#0071e3` accent (values from the approved mockup)
- Type: `-apple-system, BlinkMacSystemFont` stack, large confident headline sizes, tight letter-spacing
- Motion: restrained. Keep the existing `.reveal` fade/slide-up-on-scroll system (`script.js:3-11`, `style.css:38-51`) — it's aesthetic-neutral, already respects `prefers-reduced-motion`, not a React-Bits port, no reason to touch it.
- Keep, recolor for light background: `blur-text` (hero letter blur-in), `rotating-text` (cycling word) — mechanic is aesthetic-agnostic.
- Drop entirely: `border-glow`, `spotlight-card` — neon green/cyan hover glow conflicts with light/clean direction.
- Responsive: extend the existing breakpoints (900px / 760px / 600px in `style.css`), don't replace the approach.

## Agent architecture

Model for every agent: Sonnet 5. Main thread is the manager: writes Phase 0, dispatches, collects, merges, resolves conflicts, runs verification. Isolation mechanism: one git worktree per agent (via `using-git-worktrees`) so concurrent agents never touch the same working files — this is what makes true parallelism safe here, as opposed to 10 agents editing the live `index.html`/`style.css` directly.

**Phase 0** (main thread, sequential, not a subagent slot): `tokens.css` + `design-brief.md`.

**Phase 1a — 8 agents, parallel, each its own worktree, each owns full markup+CSS+copy for its piece:**
1. Nav + Hero
2. Features grid (6 cards)
3. Showcase section ("Set it once, it runs itself")
4. Pricing cards
5. Compare table (Free vs Pro)
6. FAQ — keep the existing accordion JS behavior (`data-state` toggle, grid-rows height trick), restyle only
7. Footer + `privacy.html` (bring the standalone privacy page to the same visual system)
8. Asset prep — crop/optimize `images/dashboard.png` and `images/app-profiles.png` for the new layout, check favicon. Touches only `images/`, so it's genuinely conflict-free alongside the other 7.

**Phase 1b — 2 agents, sequential, run only after main thread merges Phase 1a into real `index.html`/`style.css`:**
9. Accessibility pass — semantic HTML, contrast against the new light background, alt text, aria attributes. Produces a patch against the merged output.
10. Responsive/mobile pass — verify and fix the 3 breakpoints against the merged output.

Main thread reconciles both patches (small diffs, manual merge) rather than a third auto-merge step.

## Verification

No build step, no test suite (static site). Verification is: visual check in browser via the live-server already running on `127.0.0.1:8000`, confirm FAQ accordion still opens/closes, confirm all 3 breakpoints render correctly, confirm buy/download buttons still show the placeholder alert (not a real or fake checkout), confirm all images load.

## Error handling

Worktree isolation prevents file-level clobbering between agents. If two sections disagree visually (e.g. mismatched card radius) at merge time, main thread fixes it against `tokens.css` as the source of truth. Content facts (prices, feature claims, FAQ answers) are never reinterpreted to resolve a conflict — if a fact-level inconsistency shows up, it gets flagged to the user, not silently guessed.

## Git & deploy stance

Prior work on this site was kept fully offline (no commit/push) until told otherwise. For this rebuild: commit locally once Phase 1a+1b are merged and verified in-browser (commits are local and reversible, useful as a checkpoint across a 10-agent effort). Do **not** push to `origin/main` or otherwise deploy — pushing to `main` auto-deploys via the existing GitHub Actions workflow to the live GitHub Pages site, which is an external, harder-to-reverse action — without asking separately first.

## After merge

Same live-preview, small-step iteration workflow already established (live-server hot reload, user gives direct visual feedback) continues once the rebuilt skeleton lands — this design covers getting to that first full skeleton, not the follow-on polish loop.
