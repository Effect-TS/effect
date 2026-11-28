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

Example:

```sh
nix develop -c bash -c 'hill-climb-tools/ab.sh "Effect/forkJoin,Schema" 5 1000'
cd hill-climb-tools && node build-cases.mjs && node --cpu-prof --cpu-prof-dir=../tmp/prof run-case.mjs app-untraced 2500
node cpu-lines.mjs ../tmp/prof/*.cpuprofile 30
```

Short filtered runs can disagree with a full `pnpm hostperf` run when the machine is busy. Re-measure main in the same session (`pnpm hostperf --out` from `tmp/bundle-base`) before attributing a gap to the code.
