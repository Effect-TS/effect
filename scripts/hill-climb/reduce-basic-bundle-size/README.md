# basic.ts bundle-size tooling

Helpers for measuring `packages/tools/bundle/fixtures/basic.ts`. Run them from the
repository root after `pnpm build` (or `pnpm --dir packages/effect build` when only
`effect` changed; it takes a few seconds).

- `bundle-mangled.ts <entry.ts> <out.js>`: writes the minified bundle and prints the
  gzipped byte count used by `report` and `compare-selected`. Fast inner loop.
- `top-modules.mjs <name.raw-data.json> [limit]`: ranks modules from
  `pnpm bundle-analyze` output by rendered and gzipped size, as Markdown tables.
- `module-code.ts <entry.ts> [module-filter]`: lists the modules in the unminified
  bundle by rendered size. With a filter (`dist/Context.js`) it prints the code those
  modules contribute, which shows the declarations that survive tree-shaking.
- `bundle-unmangled.ts <entry.ts> <out.js>`: writes the same bundle minified but not
  mangled, a faster input for `attribution.mjs` than a full `pnpm bundle-analyze`.
- `attribution.mjs <bundle.js> [limit]`: removes each top-level declaration in turn
  and reports the gzipped bytes it accounts for. Use it on the unmangled
  `tmp/bundle-analysis/basic.min.js` so names stay readable.

```sh
pnpm --dir packages/effect build
node scripts/hill-climb/reduce-basic-bundle-size/bundle-mangled.ts packages/tools/bundle/fixtures/basic.ts tmp/basic.js
pnpm bundle-analyze packages/tools/bundle/fixtures/basic.ts
node scripts/hill-climb/reduce-basic-bundle-size/top-modules.mjs tmp/bundle-analysis/basic.raw-data.json
node scripts/hill-climb/reduce-basic-bundle-size/attribution.mjs tmp/bundle-analysis/basic.min.js 40
```

`bundle-compare-selected --base main` measures against the local `main` ref. If that
ref is stale, pass `--base origin/main` instead.

Check the other fixtures before finishing, since a change that helps `basic.ts` can pull
modules into bundles that do not run effects (`brand.ts`, `optic.ts`). Comparing every
fixture takes about three minutes:

```sh
pnpm bundle-compare-selected --base origin/main packages/tools/bundle/fixtures/*.ts
```

Gotchas:

- `pnpm check` writes unannotated output over `packages/effect/dist`. Without the
  `/*#__PURE__*/` annotations the bundle grows about tenfold, so rebuild before measuring.
- The bundle tooling resolves `effect` modules as having side effects. Any top-level
  statement with a side effect is kept, along with everything it references.
- `bundle-compare-selected --keep-base` leaves `tmp/bundle-base` behind, which makes
  `pnpm check` report duplicate packages. Run the last comparison without `--keep-base`.
- The `[Equal.symbol]`, `[Hash.symbol]` and `toString` methods of `Exit`, `Cause` and
  `Context` sit on prototypes every fiber creates, so bundlers keep them along with
  everything they call. Leaving `Equal.ts`, `Hash.ts` or `Formatter.ts` out of `basic.ts`
  means those methods can no longer run on their own, for example when called by literal
  key or from another copy of effect.

- `hash-parity.mjs <base dir> <current dir> [cases]`: checks that `Hash.hash` and
  `Equal.equals` give the same results in two copies of effect on random nested values,
  both directly and wrapped in `Exit` and `Cause`. Each directory is a `packages/effect/src`
  or `packages/effect/dist`, for example from a worktree of `origin/main`:
  `git worktree add --detach ../main-wt origin/main`.
- `pipe-arguments-bench.mjs [calls]`: compares the unrolled `pipeArguments` switch with a
  switch that stops at five functions and with a plain loop, from call sites with literal
  arguments.
- `hot-path-bench.mjs <base dist> <current dist>`: times fiber startup (`runSync`, `runFork`),
  flat and overlay `Context.get`, `Equal.equals` on `Cause` and `Context`, `Formatter.format`
  and `Predicate.hasProperty` in two copies of effect. On a shared machine the ratios move
  by up to about 50% between runs, so run it several times and in both argument orders.
- `isolated-bench.mjs <base dist> <current dist> [case ...]`: times fiber startup, a fiber
  cache refresh, flat, overlay and mixed `Context.get`, `Equal.equals` and `Hash.hash` on the
  runtime data types, `Formatter.format` and the type guards. Each sample runs in its own
  process and base and current alternate, so the copies share neither inline caches nor
  machine drift. All cases take about four minutes; pass case names to run a few. Check the
  harness with the same dist on both sides when a ratio looks odd.
- `equality-parity.mjs <base dist> <current dist>`: checks that `Context` and `Cause` equality
  and `Cause` hashes match between two copies of effect.
- `format-parity.mjs <base dist> <current dist> [cases]`: checks that `Formatter.format` prints
  the same text in two copies of effect on random nested values, including `toString` methods
  that throw or return something unconvertible, throwing getters, revoked proxies, cycles and
  redactable values.
- `module-attribution.ts <entry.ts> [group=mod1,mod2 ...]`: gzip attribution per module and per
  named group of modules, for questions like "what do `Equal`, `Hash` and `Formatter` cost
  together". `attribution.mjs` answers the same per declaration.

More gotchas:

- A function imported from another module costs a few nanoseconds per call in unbundled ESM.
  Moving the `Context` lookup into an internal module made `Context.get` 15% to 50% slower than
  main; keep hot-path helpers in the module that calls them and measure with `isolated-bench.mjs`.
- `pnpm check` also fails while `tmp/bundle-base` exists. Move the worktree out of the repository
  first (`git worktree move tmp/bundle-base ../bundle-base`) and back before comparing.
- Building only `packages/effect` in the base worktree and writing `.bundle-build-stamp` is enough
  for `bundle-compare-selected` to reuse it, because every fixture imports from `effect` alone.
- The shared checkout cache lists `scripts/hill-climb` in `info/exclude`, so `git add` skips new
  files here without failing the commit. Add them with `git add -f` and check `git status` before
  pushing; two benchmark scripts were lost that way.

Measured in round 14:

- Building `Fiber.Cache` in a loop over a table of keys (`cache[field] = ...`) saves about 90 B
  over ten explicit reads, but the keyed stores make every cache build about 400 ns slower:
  `runSync` took 1.47 times main's time, since each run adds a scheduler and rebuilds the cache.
  Keep the object literal with one read per field.
- An object table of keys and defaults read by property (`keys.scheduler`) costs about 90 B more
  than separate constants, because property names are not mangled. Separate constants plus a
  record typed by `Fiber.Cache` for the invalidation set give the same drift protection for free.
- `Hash.hash(reasons)` in `CauseImpl` instead of `Hash.array(reasons)` makes hashing a fresh
  `Cause` about 1.38 times slower. `Hash.array` alone restores it.
- `getRedacted` could use `Context.empty()` instead of its hand-written empty context (33 B
  smaller), but that makes `Redactable.ts` import `Context.ts` and closes an import cycle through
  `Formatter.ts`.
- Run `Metric.test.ts` from the repository root (`pnpm exec vitest run packages/effect/test/Metric.test.ts`);
  from `packages/effect` it cannot resolve `@effect/opentelemetry`.
- `format-edge.mjs <absolute dist dir>`: prints `Formatter.format` output for `toString` methods that
  throw, return something unconvertible or sit behind an accessor, with the number of accessor reads.
  Run it once per copy of effect and compare the lines.

`isolated-bench.mjs` also times hashing of new objects, maps, sets and floats and `Cause.combine`.

Measured in round 15 (node 26, `isolated-bench.mjs`, ratios are candidate over main):

- The round 8 commit was slower than main where nobody had measured: `Context.get` 1.24 times on an
  overlay context and 1.37 times alternating flat and overlay, `Hash.hash` of a new cause 1.22 times
  and `Cause.combine` 1.42 times.
- The overlay slowdown came from dispatching on the prototype method. A context that has flattened
  itself kept calling it for every read. Dispatching on the `overlay` field sends flattened contexts
  down the flat path: 0.78 (overlay) and 0.87 (mixed).
- `lookup` and `notFound` have to be unexported bindings of `Context.ts`. Exported, with the same
  code in the same module, flat `Context.get` is 1.09 and mixed 1.11; unexported they are 0.91 and
  0.87. Importing them from an internal module costs the same as exporting them.
- Giving flat contexts an own `overlay = undefined` field made flat reads slower (1.17 to 1.20) and
  cost 7 B. Leave the field off flat contexts.
- `Hash.array(reasons)` in `CauseImpl` costs 16 B over `Hash.hash(reasons)` and restores main's
  timings. `Hash.hash` on the array adds a second `WeakMap` write per new cause.
- Main's `Formatter.ts` costs 24 B more than the round 8 rewrite. The two print the same text on
  12,000 random cases; the rewrite reads an accessor `toString` once where main reads it four times.
- `Predicate.hasProperty` through `dual` costs 130 B (6,494 B, 13.3% under main). Written out it is
  about 20 times faster called directly (0.5 against 10.5 ns), while `Exit.isExit` over a mix of
  value shapes is 1.12 times main (16.2 against 14.5 ns).
- A shared helper for the stack frame annotation cost 3 B more than the two inline calls.
- The scripts report bytes and the bundle report divides by 1000, so 6.20 KB is 6,200 B. Main is
  7,491 B, which makes 15% smaller 6,367 B.
