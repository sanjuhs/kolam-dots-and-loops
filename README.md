# Kolam · Dots & Loops

A calm, free rangoli puzzle for children and grown-ups. No ads or tracking. Play as a guest, or create a free account to save across devices and join the leaderboard.

- **Kolam levels**: every dot (pulli) holds one piece of the line. Tap a piece to turn it. When every strand meets its neighbour, the sikku kolam closes and fills with colour.
- **Rangoli pictures**: lotus, diya, peacock, hibiscus, pookalam, mor pankh, kalash, Ganesha and more, cut into tiles that you turn back into place.
- **Rangavalli mandalas**: round designs with 5- to 16-fold symmetry, made of rings that you turn until the petals line up.
- 2,000 numbered levels in ten chapters, from two dots to 11 x 11 weaves, then endless levels after that. Every level is generated from its number, so everyone sees the same level 37.
- Works offline and can be added to a phone home screen.

## New puzzle collections and accounts

- Six mandala families: lotus, stars, lace, spiral, jewels and sun wheels, up to 24-fold symmetry and twelve rings.
- Large pictures up to 12 × 12 (144 tiles), with zoom controls.
- Rolling rows and columns: tap a strip to wrap it around, or reverse the last strip.
- A puzzle timer, move/hint counts, daily puzzle, personal milestones, all-time/today points and fastest no-hint solves.
- Username/password accounts, optional email login, recovery codes and cloud progress. Guest/offline play remains available. Email-reset delivery requires a configured sender; a recovery code works without one.

See [server/README.md](server/README.md) for local full-stack development, production resources, recovery, score validation and backups.

## Run it

It is plain HTML, CSS and JavaScript with no build step.

```bash
python3 -m http.server 8771
```

Then open http://localhost:8771.

Run the level-generation, lifecycle and offline-cache regression checks with Node.js:

```bash
node --test tests/*.test.cjs
```

## Files

- `index.html` – the game screens and rendering
- `puzzle-engine.js`, `picture-symmetries.js` – shared deterministic puzzle rules
- `community.js` – accounts, timer, progress sync and leaderboard
- `server/` – VPS API, authentication and persistent scores
- `motifs.js` – the rangoli pictures, drawn as SVG in code
- `sw.js`, `manifest.webmanifest`, `icon*` – offline support and home-screen install

## Share a level

Add the level number to the link: `/#37`. Gallery pictures look like `/#g-peacock-4`, and mandalas like `/#m-8-4` (8 petals, 4 rings).

## Performance checks

See [PERFORMANCE.md](PERFORMANCE.md) for the 16 November 2026 investigation, measurements and remaining device-testing limits.

An optional mobile-browser smoke check uses Playwright against the local server on port 8771:

```bash
node tests/browser-smoke.cjs
```

Playwright and its Chromium browser must be available separately; the game itself has no dependencies. Set `CHROME_PATH` to an installed Chrome executable to use it instead. This check covers play, hints, wins, gallery puzzles, audio cleanup and a real offline reload.
Set `BASE_URL=https://rangoli-design-game.vercel.app` to run the same check against production.

## License

MIT
