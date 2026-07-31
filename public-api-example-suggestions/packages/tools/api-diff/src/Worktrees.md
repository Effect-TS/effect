# Example Suggestions: `@effect/api-diff/Worktrees`

- **Package:** `@effect/api-diff`
- **Source:** `packages/tools/api-diff/src/Worktrees.ts`
- **Uncovered API records:** 2
- **Priorities:** 0 required, 1 recommended, 1 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                 | Line | Kind               | Priority        |
| --------------------------------------------------- | ---: | ------------------ | --------------- |
| `@effect/api-diff/Worktrees.Worktrees`              |   25 | `unmodeled-export` | **recommended** |
| `@effect/api-diff/Worktrees.PrepareSnapshotOptions` |   15 | `unmodeled-export` | **optional**    |

## Recommended

### `@effect/api-diff/Worktrees.Worktrees`

- **Source:** `packages/tools/api-diff/src/Worktrees.ts:25`
- **Kind / category:** `unmodeled-export` / `none`
- **Priority:** **recommended** This API is absent from the compliant JSDoc model, so repair its documentation shape before implementing an example.
- **Current description:** No compliant JSDoc description is currently available.
- **Signature hint:** `export class Worktrees extends Context.Service<Worktrees, { readonly resolveRef: (repoRoot: string, ref: string) => Effect.Effect<string, ApiDiffError> readonly prepareSnapshot: (options: PrepareSnapshotOptions) => Effect.Effect<ApiSnapshot, ApiDiffError> }>()("@effect/api-diff/Worktrees") { static readonly layerNoDependencies = Layer.effect( Worktrees, Effect.gen(function*() { const fs = yield* FileSystem.FileSystem const path = yield* Path.Path const snapshotter = yield* Snapshotter const spaw`
- **Import guidance:** Start from `import { Worktrees } from "@effect/api-diff/Worktrees"` and use `Worktrees`.
- **Suggested snippet:** Consume `Worktrees` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Future-agent advice:** Add compliant prose, `@category`, and `@since` before any snippet. Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `@effect/api-diff/Worktrees.PrepareSnapshotOptions`

- **Source:** `packages/tools/api-diff/src/Worktrees.ts:15`
- **Kind / category:** `unmodeled-export` / `none`
- **Priority:** **optional** This API is absent from the compliant JSDoc model, so repair its documentation shape before implementing an example.
- **Current description:** No compliant JSDoc description is currently available.
- **Signature hint:** `export interface PrepareSnapshotOptions { readonly repoRoot: string readonly cacheRoot: string readonly worktreesRoot: string readonly name: "base" | "head" readonly ref: string readonly sha: string readonly modules?: ReadonlyArray<string> }`
- **Import guidance:** Start from `import { PrepareSnapshotOptions } from "@effect/api-diff/Worktrees"` and use `PrepareSnapshotOptions`.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `PrepareSnapshotOptions`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add compliant prose, `@category`, and `@since` before any snippet. Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.
