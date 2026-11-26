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

Gotchas:

- `pnpm check` writes unannotated output over `packages/effect/dist`. Without the
  `/*#__PURE__*/` annotations the bundle grows about tenfold, so rebuild before measuring.
- The bundle tooling resolves `effect` modules as having side effects. Any top-level
  statement with a side effect is kept, along with everything it references.
- `bundle-compare-selected --keep-base` leaves `tmp/bundle-base` behind, which makes
  `pnpm check` report duplicate packages. Run the last comparison without `--keep-base`.
