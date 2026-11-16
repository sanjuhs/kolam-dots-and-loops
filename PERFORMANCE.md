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

## Extended live session (20 minutes)

Tested production commit `2ca8ee2` on 16 November 2026 with a 390×844 touch viewport, DPR 2 and 6× CPU slowdown. Navigator reported four cores and 2 GB device memory; that is an advertised browser property, **not** an actual 2 GB RAM cap or a Motorola hardware emulator. The Chrome process ran on this Mac.

Completed 2,702 sequential levels (looping through 1–2,000), 10,782 dispatched pointer taps and 98,456 hints, with sound enabled during play, regular level/gallery navigation and forced-GC checkpoints. The accelerated solver exercised actual game functions and event handlers rather than reproducing a person's solve pace.

| Checkpoint | Completed levels | JS heap after GC | Renderer RSS |
| --- | ---: | ---: | ---: |
| Cold baseline | 0 | 0.989 MiB | 300.8 MiB |
| 2.1 min, warm | 288 | 2.118 MiB | 368.8 MiB |
| 12.4 min | 1,680 | 2.308 MiB | 439.2 MiB |
| 16.5 min | 2,224 | 2.274 MiB | 472.9 MiB |
| 20.1 min, end | 2,702 | 2.292 MiB | 502.0 MiB |
| After idle | 2,702 | 2.201 MiB | 501.8 MiB |

No page errors or renderer crashes occurred. JavaScript heap stayed near its warmed level and fell after idle. Listeners peaked at 809 and fell to 409 after the level loop; DOM nodes peaked at 4,818 and later fell as screens/chapters changed. Those counts include the current chapter's level buttons, decoded image documents and SVG shadow content. There was no evidence of accumulating JS listeners or an unbounded JS heap leak in this session.

Renderer RSS is a separate concern: it rose from 301 to 502 MiB and was still near 502 MiB after idle. It includes browser caches, raster data and allocator reservations. This test does **not** establish that total browser memory stays flat, or that a low-RAM phone will remain smooth. Direct testing on the affected phone is still required. The new release also avoids runtime picture-symmetry image decoding for ranked/gallery variants through a small shared canonical table.

Raw checkpoints are in [performance/2026-11-16-live-20min.json](performance/2026-11-16-live-20min.json). Reproduce with Playwright available and `node scripts/stress-live.cjs`; set `STRESS_MINUTES`, `STRESS_OUTPUT`, `BASE_URL` or `CHROME_PATH` as needed. The script samples process RSS using macOS/Linux `ps`; it is not a general phone memory profiler.

## New collections: ten-minute production session

The new collections were tested on production frontend `44a86f3`: 390×844 touch viewport, DPR 2, 6× CPU slowdown. The solver repeatedly cycled through 29 fixed puzzles: twelve-ring mandalas in all six styles with 8, 16 or 24 petals, 144-tile pictures, rolling rows and columns, and large numbered puzzles. Later recovery-copy and audio-suspension changes do not change these puzzle definitions.

Completed **1,131 solves in 10 minutes**, with no page errors or renderer crashes. Warmed post-GC heap measured 2.221 MiB after 232 solves, 2.265 MiB after 696, and 2.283 MiB after 1,131. DOM nodes and listeners remained near 2,583 / 197 after warm-up. Every screen-exit checkpoint had **zero active game intervals, zero pending hint/win timers and zero connected audio voices**. The local practice list held the same 29 entries throughout repeated play.

Renderer RSS rose from 295 MiB cold to 461 MiB warm, reached 539 MiB, fell to 496 MiB at eight minutes and ended at 527 MiB, unchanged after idle. This is consistent with bounded JS objects and variable native/browser allocations in this run; it is not evidence of a flat native footprint. No conclusion that native memory is leak-free is justified.

A separate two-minute diagnostic used normal CPU speed, the same puzzle corpus and a synthetic critical [Chrome DevTools memory-pressure notification](https://chromedevtools.github.io/devtools-protocol/tot/Memory/). After 257 solves, RSS remained at 451 MiB after idle and after the notification, while JS heap stayed at 2.239 MiB. Therefore this experiment did **not** establish that all observed renderer memory would be released under pressure. It cannot distinguish cache/allocator reservations from a native retention problem. None of these desktop simulations replaces profiling the affected phone.

Raw records: [ten-minute collection session](performance/2026-11-16-live-packs-10min.json) and [pressure diagnostic](performance/2026-11-16-memory-pressure-diagnostic.json). `scripts/stress-packs.cjs` reproduces these tests; `MEMORY_PRESSURE=1` enables the diagnostic and `CPU_SLOWDOWN=1` selects normal CPU speed.

## Production feature verification

- Nine generator/lifecycle/offline checks and three backend checks pass. The backend checks cover registration, cookie sessions, recovery-code replacement and password reset, session revocation, origin checks, invalid replay rejection, server-derived times/points, score idempotency, deletion, new packs, rolling puzzles and all 10,000 picture levels in the ranked range.
- The live mobile-browser account flow passes: register without email → save recovery code → rank a solve → see leaderboard → replace recovery code with password confirmation → sign out → recover account → sign in → solve master mandala, both rolling modes and 144-tile picture → reload with progress intact → reload offline, finish practice, reconnect and sync.
- Session cookies were checked for HttpOnly, Secure and SameSite=Lax on production. Recovery downloads include the username and game URL. Test accounts were deleted after verification.
- Backend account/session and saved-puzzle data survived a fresh container replacement. The dedicated `/data` volume was verified on the running container. The HTTPS health endpoint reports healthy; SMTP readiness reports false, so email reset controls stay hidden and recovery codes remain available.
