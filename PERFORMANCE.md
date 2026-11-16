# Phone performance investigation — 16 November 2026 (IST)

Project: Kolam · Dots & Loops. Reported device: an older Motorola phone, exact model and browser unknown. Reported URL: https://rangoli-design-game.vercel.app/.

The live HTML and service worker matched the original local files byte for byte when inspected. Baseline commit: `675068a`. The measurements below were gathered locally before deployment.

## Findings and changes

- **SVG rendering cost:** picture tiles and mandala rings used `<use>` to clone the entire vector artwork into each tile's SVG shadow tree. They now reference one shared SVG image. Gallery thumbnails use lazy images instead of thousands of inline vector elements. The game board's full-surface shadow filter and animated shadow bloom were removed, and reduced-motion preferences are respected.
- **Stale effects:** solving a level and immediately loading another let the previous win timeout mark the new board as won. Confirmed in the browser. Level changes and screen exits now cancel win/hint timers, and screen exits release the board and current level.
- **Picture loading:** obsolete image loads are aborted when navigating away or requesting another puzzle. Image handlers, source references and fallback timers are cleared after success, failure or cancellation.
- **Audio lifecycle:** each finished voice explicitly disconnects its oscillator and gain node. Voices are capped at 24. Screen exits, muting and backgrounding stop voices and suspend the audio context. Hidden pages do not start new notes. This is cleanup and a limit on work; the original audio code was not demonstrated to leak indefinitely.
- **Offline storage growth:** the old service worker cached every fetched GET, including separate query-string variants. The replacement caches only eight fixed app files under canonical keys, avoids caching HTTP errors, and deletes only old `kolam-*` caches. This concerns persistent storage, not proof of a RAM leak. Cache version is `kolam-v5`.

## Measurements

Chrome headless on this Mac, mobile viewport 390×844, device pixel ratio 3. DOM counts use Chrome DevTools Protocol `Memory.getDOMCounters` after forced garbage collection and include image documents and SVG shadow content.

| Measurement | Original | Changed |
| --- | ---: | ---: |
| Hard Peacock 6×6 puzzle, DOM nodes | 7,680 | 878 |
| Mixed 100-cycle run, cumulative browser task time | 3.31 s | 1.54 s |
| Mixed run, JS heap after GC | 1.47 MiB | 1.50 MiB |

The picture has about 89% fewer DOM nodes. The mixed run repeatedly loaded a large kolam, tapped ten times, requested a hint, loaded a hard picture, visited levels and gallery, and loaded a 16-fold six-ring mandala. Task time is one comparative local run, not a phone benchmark or a frame-rate measurement.

Neither version showed sustained unbounded heap growth in that run. A further 400 mandala/kolam transitions settled at the same DOM count after each 100-transition batch in each version. The changed version can retain decoded SVG image resources in the browser cache, so total RAM savings cannot be inferred from the DOM-node reduction. Rendering overload is a plausible explanation for the reported slowdown; the Motorola's actual CPU/GPU, memory use and thermal behavior remain unmeasured.

## Validation

- `node --test tests/*.test.cjs`: nine checks pass, including generation and solvability of all 1,600 numbered kolam levels, cancellation of old effects and picture loads, audio cleanup, and bounded offline storage.
- Real mobile-browser flow: Play → hints → win → Next → levels → home → gallery → hard picture → win → next picture → mandala → win.
- Compared all 45 gallery picture configurations (15 motifs × 3 sizes) against the original: symmetry and initial rotations were unchanged.
- Confirmed finished audio voices are released and a visibility change suspends audio.
- Registered the actual service worker on localhost: repeated query variants left eight cache keys; offline reload and play succeeded.
- Inspected phone-size screenshots of hard picture and mandala boards, including a run with 6× CPU throttling; no browser errors in the smoke check. CPU throttling does not emulate the Motorola's GPU or memory limits.

`tests/browser-smoke.cjs` preserves the browser flow and offline/audio checks. It requires Playwright separately and the local server described in the README. Testing the updated hosted version on the affected phone is still needed to confirm the real-world result.
