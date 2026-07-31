# Example Suggestions: `@effect/bundle/Reporter`

- **Package:** `@effect/bundle`
- **Source:** `packages/tools/bundle/src/Reporter.ts`
- **Uncovered API records:** 6
- **Priorities:** 0 required, 2 recommended, 4 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                       | Line | Kind               | Priority        |
| --------------------------------------------------------- | ---: | ------------------ | --------------- |
| `@effect/bundle/Reporter.ReporterError`                   |   37 | `root-declaration` | **recommended** |
| `@effect/bundle/Reporter.Reporter`                        |   89 | `root-declaration` | **recommended** |
| `@effect/bundle/Reporter.ReportOptions`                   |   47 | `root-declaration` | **optional**    |
| `@effect/bundle/Reporter.VisualizeOptions`                |   57 | `root-declaration` | **optional**    |
| `@effect/bundle/Reporter.ReportSelectedOptions`           |   68 | `root-declaration` | **optional**    |
| `@effect/bundle/Reporter.ReportSelectedComparisonOptions` |   78 | `root-declaration` | **optional**    |

## Recommended

### `@effect/bundle/Reporter.ReporterError`

- **Source:** `packages/tools/bundle/src/Reporter.ts:37`
- **Kind / category:** `root-declaration` / `errors`
- **Priority:** **recommended**
- **Current description:** Error raised when generating a bundle size report or visualization fails.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { ReporterError } from "@effect/bundle/Reporter"` and use `ReporterError`.
- **Suggested snippet:** Create or capture `ReporterError` through the public operation that produces it, then assert its tag and one stable semantic field such as the input, path, or reason. Avoid stack traces and rendered message snapshots.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/bundle/Reporter.Reporter`

- **Source:** `packages/tools/bundle/src/Reporter.ts:89`
- **Kind / category:** `root-declaration` / `services`
- **Priority:** **recommended**
- **Current description:** Context service for producing bundle size reports and visualizations from Rollup-generated fixture stats.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Reporter } from "@effect/bundle/Reporter"` and use `Reporter`.
- **Suggested snippet:** Consume `Reporter` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `@effect/bundle/Reporter.ReportOptions`

- **Source:** `packages/tools/bundle/src/Reporter.ts:47`
- **Kind / category:** `root-declaration` / `options`
- **Priority:** **optional**
- **Current description:** Options for generating a bundle size comparison report against fixture files from a base directory.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/bundle/Reporter.ReportOptions`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/bundle/Reporter.VisualizeOptions`

- **Source:** `packages/tools/bundle/src/Reporter.ts:57`
- **Kind / category:** `root-declaration` / `options`
- **Priority:** **optional**
- **Current description:** Options for generating bundle visualizations for selected entry files into an output directory.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/bundle/Reporter.VisualizeOptions`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/bundle/Reporter.ReportSelectedOptions`

- **Source:** `packages/tools/bundle/src/Reporter.ts:68`
- **Kind / category:** `root-declaration` / `options`
- **Priority:** **optional**
- **Current description:** Options for generating a bundle size report for an explicit list of entry files.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/bundle/Reporter.ReportSelectedOptions`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/bundle/Reporter.ReportSelectedComparisonOptions`

- **Source:** `packages/tools/bundle/src/Reporter.ts:78`
- **Kind / category:** `root-declaration` / `options`
- **Priority:** **optional**
- **Current description:** Options for generating a bundle size comparison report for explicit entry files against a base checkout.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/bundle/Reporter.ReportSelectedComparisonOptions`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.
