# Example Suggestions: `@effect/utils/Glob`

- **Package:** `@effect/utils`
- **Source:** `packages/tools/utils/src/Glob.ts`
- **Uncovered API records:** 4
- **Priorities:** 0 required, 3 recommended, 1 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                               | Line | Kind               | Priority        |
| --------------------------------- | ---: | ------------------ | --------------- |
| `@effect/utils/Glob.layer`        |   55 | `root-declaration` | **recommended** |
| `@effect/utils/Glob.GlobError`    |   23 | `root-declaration` | **recommended** |
| `@effect/utils/Glob.Glob (value)` |   47 | `root-declaration` | **recommended** |
| `@effect/utils/Glob.Glob (type)`  |   34 | `root-declaration` | **optional**    |

## Recommended

### `@effect/utils/Glob.layer`

- **Source:** `packages/tools/utils/src/Glob.ts:55`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Layer that provides the `Glob` service using the `glob` package and maps matching failures to `GlobError`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { layer } from "@effect/utils/Glob"` and use `layer`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `layer`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/utils/Glob.GlobError`

- **Source:** `packages/tools/utils/src/Glob.ts:23`
- **Kind / category:** `root-declaration` / `errors`
- **Priority:** **recommended**
- **Current description:** Error raised when glob pattern matching fails.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { GlobError } from "@effect/utils/Glob"` and use `GlobError`.
- **Suggested snippet:** Create or capture `GlobError` through the public operation that produces it, then assert its tag and one stable semantic field such as the input, path, or reason. Avoid stack traces and rendered message snapshots.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/utils/Glob.Glob (value)`

- **Source:** `packages/tools/utils/src/Glob.ts:47`
- **Kind / category:** `root-declaration` / `services`
- **Priority:** **recommended**
- **Current description:** Service tag for filesystem glob pattern matching.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Glob } from "@effect/utils/Glob"` and use `Glob`.
- **Suggested snippet:** Consume `Glob` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `@effect/utils/Glob.Glob (type)`

- **Source:** `packages/tools/utils/src/Glob.ts:34`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Service interface for matching filesystem paths with glob patterns.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/utils/Glob.Glob`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.
