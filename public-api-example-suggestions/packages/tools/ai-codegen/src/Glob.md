# Example Suggestions: `@effect/ai-codegen/Glob`

- **Package:** `@effect/ai-codegen`
- **Source:** `packages/tools/ai-codegen/src/Glob.ts`
- **Uncovered API records:** 4
- **Priorities:** 0 required, 3 recommended, 1 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                    | Line | Kind               | Priority        |
| -------------------------------------- | ---: | ------------------ | --------------- |
| `@effect/ai-codegen/Glob.layer`        |   50 | `root-declaration` | **recommended** |
| `@effect/ai-codegen/Glob.GlobError`    |   18 | `root-declaration` | **recommended** |
| `@effect/ai-codegen/Glob.Glob (value)` |   42 | `root-declaration` | **recommended** |
| `@effect/ai-codegen/Glob.Glob (type)`  |   29 | `root-declaration` | **optional**    |

## Recommended

### `@effect/ai-codegen/Glob.layer`

- **Source:** `packages/tools/ai-codegen/src/Glob.ts:50`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Layer providing the Glob service.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { layer } from "@effect/ai-codegen/Glob"` and use `layer`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `layer`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/ai-codegen/Glob.GlobError`

- **Source:** `packages/tools/ai-codegen/src/Glob.ts:18`
- **Kind / category:** `root-declaration` / `errors`
- **Priority:** **recommended**
- **Current description:** Error during glob pattern matching.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { GlobError } from "@effect/ai-codegen/Glob"` and use `GlobError`.
- **Suggested snippet:** Create or capture `GlobError` through the public operation that produces it, then assert its tag and one stable semantic field such as the input, path, or reason. Avoid stack traces and rendered message snapshots.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/ai-codegen/Glob.Glob (value)`

- **Source:** `packages/tools/ai-codegen/src/Glob.ts:42`
- **Kind / category:** `root-declaration` / `services`
- **Priority:** **recommended**
- **Current description:** Service tag for glob pattern matching used by AI codegen tooling.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Glob } from "@effect/ai-codegen/Glob"` and use `Glob`.
- **Suggested snippet:** Consume `Glob` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `@effect/ai-codegen/Glob.Glob (type)`

- **Source:** `packages/tools/ai-codegen/src/Glob.ts:29`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Service for glob pattern matching.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/ai-codegen/Glob.Glob`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.
