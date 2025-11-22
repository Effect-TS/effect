## Goal
Resolve the Vitest v4 upgrade type errors surfaced by `pnpm build`, keeping @effect/vitest’s API compatible while aligning with Vitest’s new collector signatures and fixing the missing Node assert types.

## Findings
- `pnpm build --filter @effect/vitest` currently fails because our custom `TestCollectorCallable` allows a third `TestCollectorOptions` argument, but Vitest v4’s `TestCollectorCallable` only allows options in the second position (third is `number` only). `TestCollectorOptions` is now `Omit<TestOptions, "shuffle">`.
- Vitest v4 exports `TestAPI`, `TestCollectorCallable`, `TestOptions`, etc. from `vitest` (re-exported from `@vitest/runner/dist/tasks.d…`), so we can reuse them instead of maintaining divergent local copies.
- `packages/vitest/src/utils.ts` cannot resolve `node:assert` types because this package inherits `types: []` from the base tsconfig.

## Plan
1) Types in `packages/vitest/src/index.ts`: drop local `TestCollectorCallable`/`TestCollectorOptions`; build `API<Ctx>` from `V.TestAPI<Ctx>` plus `scopedFixtures: V.TestAPI<Ctx>["scoped"]`; ensure `Methods*` interfaces rely on Vitest’s types and remove deprecated overloads with options in the third position. ✅  
2) Internal wiring in `packages/vitest/src/internal/internal.ts`: type `defaultApi`/`makeMethods` against the new `API`; keep `Object.assign(V.it, { scopedFixtures: V.it.scoped })` but ensure all helpers (`makeTester`, `layer`, `describeWrapped`) accept/return the updated `API` so assignments satisfy Vitest’s collector callable without assertions. ✅  
3) Assert typings in `packages/vitest/src/utils.ts`: swap to Vitest’s `assert` export to avoid `node:assert` typings while retaining behavior. ✅  
4) Validation: package-local `pnpm --filter @effect/vitest build-esm` passes; top-level `pnpm build --filter @effect/vitest` still trips other packages’ build scripts because `--filter @effect/vitest` is forwarded to their `build-utils` commands (pre-existing script quirk). If needed, rerun full build once that forwarding issue is addressed. ⏳

## Notes
- Avoid type assertions; prefer explicit typing or alignment with Vitest’s exported types.  
- Keep changes localized to @effect/vitest unless the build reveals additional breakage.  
- Update docs if public-facing API annotations change.
