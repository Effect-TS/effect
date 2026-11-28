Helpers for hill-climbing `pnpm hostperf`. They are not part of the library. Run them inside `nix develop`, which pins the Node and Bun versions hostperf uses; other versions give different numbers.

- `run-case.ts`: runs one hostperf case for a fixed time and prints ns/op, under Node or Bun. Add `--cpu-prof --cpu-prof-dir=<dir>` under Node to profile it. `--bundled` runs the Vite bundle from `build-cases.mjs` instead of the sources.
- `build-cases.mjs`: bundles `cases.ts` with Vite as hostperf does, into `tmp/hc/cases.js`. `HC_ROOT=<checkout>` bundles another checkout, such as the `tmp/bundle-base` main worktree; `HC_OUT=<dir>` changes the output directory.
- `run-case.mjs`: plain-JS runner for the bundle, so no TypeScript loader is active. Reads `HC_OUT` too.
- `ab.sh "<case>[,<case>...]" [runs] [ms]`: rebuilds the bundle and prints sorted ns/op per run for Node and Bun.
- `cpu-functions.mjs` / `cpu-lines.mjs`: rank self time by function or by source line in a `.cpuprofile`.
- `bundle-quick.sh`: rebuilds only `packages/effect` and compares all fixtures against an existing `tmp/bundle-base` worktree, about 15s instead of a full `pnpm bundle-compare main`. Prints a few core fixtures and the summed difference.
- `bundle-bytes.ts [fixture ...]`: Markdown table of exact minified and gzipped bytes per fixture against `tmp/bundle-base`, for differences below the 10-byte resolution of the report. Build `packages/effect` first.
- `abx.sh A_DIR B_DIR "<case>[,<case>...]" [runs] [ms] [hosts]`: alternates runs of two bundles built with `HC_OUT`, such as a branch and a base checkout, and prints median ns/op and A/B. Set `PIN="taskset -c N"` to pin both to one core when other work shares the machine.
- `chromium-verify.mjs`: bundles `chromium-probe.ts` and runs it in Playwright Chromium. It checks `postTask` yields, priority order, interruption, the fallback for a `scheduler` global without `postTask`, and that a throwing task is reported without an unhandled rejection. Exits non-zero on failure.
- `compare-reports.ts BASE.json HEAD.json`: prints the `pnpm hostperf --baseline` table and a verdict count per host for two saved reports, so one run can be compared with the pinned baseline and with a same-session main report without running again.
- `abmin.mjs A_DIR B_DIR "<case>[,<case>...]" [runs] [ms] [hosts]`: like `abx.sh`, but it swaps the order every pair and also prints the fastest run of each side. On a machine shared with other work the fastest run is the least disturbed one, so its ratio is steadier than the ratio of medians.
- `alternate.sh OUT_DIR [chunks] [rounds]`: runs `pnpm hostperf` on head and on the `tmp/bundle-base` worktree in alternating chunks, so both sides see the same drift in machine load, and merges each side into one report with `merge-reports.ts`. `OUT_DIR/alternate.log` records the load average before each chunk.
- `merge-reports.ts OUT.json CHUNK.json...`: joins reports of the same tree into one, as if their rounds came from a single run.
- `[BASE_REF=<ref>] evidence.sh OUT_DIR PINNED_MAIN_REPORT.json [chunks] [rounds] [test files...]`: collects a round's hand-over evidence on a committed tree: the alternating hostperf run compared with both the pinned baseline and the main chunks, the Chromium probe, `pnpm bundle-compare $BASE_REF`, exact bundle bytes, scoped tests, the full `effect` suite, lint and check. `OUT_DIR/validation.txt` records each step's exit status and duration. It reuses an alternating run already in `OUT_DIR`, and removes `tmp/bundle-base` before `pnpm check`.
- `async-context-cost.mjs`: microbenchmark of the ways to capture and restore a Node async context (`AsyncResource`, `AsyncLocalStorage.snapshot`), and the Node source of each. Runs under Bun too.
- `array-insert.mjs`: microbenchmark of ways to copy an array with one element inserted.

Example:

```sh
nix develop -c bash -c 'hill-climb-tools/ab.sh "Effect/forkJoin,Schema" 5 1000'
cd hill-climb-tools && node build-cases.mjs && node --cpu-prof --cpu-prof-dir=../tmp/prof run-case.mjs app-untraced 2500
node cpu-lines.mjs ../tmp/prof/*.cpuprofile 30
```

Short filtered runs can disagree with a full `pnpm hostperf` run when the machine is busy. Re-measure main in the same session (`pnpm hostperf --out` from `tmp/bundle-base`) before attributing a gap to the code.
