# Example Suggestions: `@effect/bundle/Rollup`

- **Package:** `@effect/bundle`
- **Source:** `packages/tools/bundle/src/Rollup.ts`
- **Uncovered API records:** 5
- **Priorities:** 0 required, 2 recommended, 3 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                      | Line | Kind               | Priority        |
| ---------------------------------------- | ---: | ------------------ | --------------- |
| `@effect/bundle/Rollup.RollupError`      |   39 | `root-declaration` | **recommended** |
| `@effect/bundle/Rollup.Rollup`           |   84 | `root-declaration` | **recommended** |
| `@effect/bundle/Rollup.BundleOptions`    |   60 | `root-declaration` | **optional**    |
| `@effect/bundle/Rollup.BundleAllOptions` |   72 | `root-declaration` | **optional**    |
| `@effect/bundle/Rollup.BundleStats`      |   49 | `root-declaration` | **optional**    |

## Recommended

### `@effect/bundle/Rollup.RollupError`

- **Source:** `packages/tools/bundle/src/Rollup.ts:39`
- **Kind / category:** `root-declaration` / `errors`
- **Priority:** **recommended**
- **Current description:** Error raised when Rollup bundling, output generation, or bundle size measurement fails.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { RollupError } from "@effect/bundle/Rollup"` and use `RollupError`.
- **Suggested snippet:** Create or capture `RollupError` through the public operation that produces it, then assert its tag and one stable semantic field such as the input, path, or reason. Avoid stack traces and rendered message snapshots.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/bundle/Rollup.Rollup`

- **Source:** `packages/tools/bundle/src/Rollup.ts:84`
- **Kind / category:** `root-declaration` / `services`
- **Priority:** **recommended**
- **Current description:** Context service for bundling entry files with Rollup and measuring their gzipped output size.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Rollup } from "@effect/bundle/Rollup"` and use `Rollup`.
- **Suggested snippet:** Consume `Rollup` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `@effect/bundle/Rollup.BundleOptions`

- **Source:** `packages/tools/bundle/src/Rollup.ts:60`
- **Kind / category:** `root-declaration` / `options`
- **Priority:** **optional**
- **Current description:** Options for bundling one entry file, optionally writing a minified output and generating a visualization.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/bundle/Rollup.BundleOptions`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/bundle/Rollup.BundleAllOptions`

- **Source:** `packages/tools/bundle/src/Rollup.ts:72`
- **Kind / category:** `root-declaration` / `options`
- **Priority:** **optional**
- **Current description:** Options for bundling multiple entry files with shared visualization and output-directory settings.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/bundle/Rollup.BundleAllOptions`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/bundle/Rollup.BundleStats`

- **Source:** `packages/tools/bundle/src/Rollup.ts:49`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Bundle size statistics for an entry file, including its path and gzipped size in bytes.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { BundleStats } from "@effect/bundle/Rollup"` and use `BundleStats`.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `BundleStats`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.
