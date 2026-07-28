# Reck — Design Review panel driver

Browser automation that feeds the three-evaluator design review. It **captures
evidence only** — it judges nothing and fabricates nothing. Evaluation (the
three roles, the notes, `REVIEW.md`) is done by a human/model reading the
artifacts this produces.

## Requirements

- Network egress to **`base44.app`** (the app and its API share that host). If
  the environment's egress policy blocks it, the driver only reaches `/login`
  and the review is impossible — this is the blocker that stopped the first run.
- Chromium is pre-installed at `/opt/pw-browsers` (auto-detected). `playwright`
  is a dev dependency.

## Run

```bash
RECK_EMAIL='...' RECK_PASS='...' node scripts/design-review/panel-driver.mjs
# against a local dev server instead of the hosted app:
BASE_URL=http://localhost:5173 RECK_EMAIL='...' RECK_PASS='...' node scripts/design-review/panel-driver.mjs
```

Credentials are read from the environment and **never committed**. A logged-in
session is cached to `out/state.json` so reruns skip the login form.

## What it produces (under `scripts/design-review/out/`, git-ignored)

For each screen — Hoje, Padrões, Tendências, Histórico, Check-in, Saúde:

- `<key>-01-top.png`, `<key>-02-full.png` — first paint + full page.
- `<key>-scroll-NN-yNNN.png` — slow scroll down, one frame per step.
- `<key>-midscroll-behind-nav.png` — parked at ~55% so real content sits behind
  the glass bottom nav (the brief's "observe o que está atrás da barra").
- `<key>-navbar-crop.png` — just the bottom nav over content (glass fallback /
  legibility check).
- `<key>-top-after-return.png` — after scrolling back up.
- `today-healthcard-*` / `saude-via-card.png` — reaching `/saude` by tapping the
  Today health card, the only real entry point.
- `audit.json` — hard measurements per screen: tap targets < 44px, text under
  the 11px floor, `font-mono` above the semibold ceiling, horizontal overflow,
  truncation, signal-color tallies, and console errors.

The PNGs are the primary evidence; `audit.json` backs the objective findings
(tap-target size, type floor, mono weight) so they don't rest on eyeballing.
