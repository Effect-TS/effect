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

- `hash-parity.mjs <base dist> <current dist>`: checks that `Hash.hash` and `Equal.equals`
  give the same results in two builds of effect (for example a `main` worktree's
  `packages/effect/dist` and the current one) on random nested values.
- `pipe-arguments-bench.mjs`: compares the unrolled `pipeArguments` switch with a plain loop.
