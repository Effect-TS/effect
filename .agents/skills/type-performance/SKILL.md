---
name: type-performance
description: TypeScript compiler performance. Use for slow type checking, typeperf fixtures, cross-ref comparisons, or threshold changes.
---

Use `typeperf` for deterministic TypeScript instantiation and materialized type
regression gates. Use the `type-testing` skill instead when verifying
type correctness, inference, assignability, or displayed public types.

Do not infer an improvement from an unrelated compiler run. Validate type
behavior independently before measuring, isolate one type-level path per
fixture, and compare the same fixture and compiler environment across revisions.

Read `packages/effect/typeperf/README.md` before changing the harness or adding
a fixture. Add a typeperf fixture only for a specific type-level path being
optimized. Use realistic public package imports, repeat the suite baseline
warmup, and export only the aliases needed to force the computation.

Before updating a targeted threshold, record its previous value and the measured
result, then explain why the delta is expected. Measure, update, and run a clean
verification with:

```sh
pnpm typeperf <suite>/<fixture>
pnpm typeperf <suite>/<fixture> --update
pnpm typeperf <suite>/<fixture>
```

Cross-ref comparisons use a separate fixture registry and are currently limited
to the `httpapi` suite registered in `packages/effect/typeperf/compare.mjs`:

```sh
pnpm typeperf-compare httpapi[/fixture] --base main --head HEAD
```

Keep normal threshold fixtures and comparison fixtures separate. After changing
typeperf, run the focused validation and formatting checks documented in its
README.
