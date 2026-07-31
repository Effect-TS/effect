# Example Suggestions: `@effect/utils/Codegen`

- **Package:** `@effect/utils`
- **Source:** `packages/tools/utils/src/Codegen.ts`
- **Uncovered API records:** 5
- **Priorities:** 0 required, 3 recommended, 2 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                             | Line | Kind               | Priority        |
| ----------------------------------------------- | ---: | ------------------ | --------------- |
| `@effect/utils/Codegen.BarrelCodegenError`      |   28 | `root-declaration` | **recommended** |
| `@effect/utils/Codegen.BarrelGenerator (value)` |  138 | `root-declaration` | **recommended** |
| `@effect/utils/Codegen.layer`                   |  148 | `root-declaration` | **recommended** |
| `@effect/utils/Codegen.BarrelFile`              |  112 | `root-declaration` | **optional**    |
| `@effect/utils/Codegen.BarrelGenerator (type)`  |  124 | `root-declaration` | **optional**    |

## Recommended

### `@effect/utils/Codegen.BarrelCodegenError`

- **Source:** `packages/tools/utils/src/Codegen.ts:28`
- **Kind / category:** `root-declaration` / `errors`
- **Priority:** **recommended**
- **Current description:** Error raised when barrel export generation cannot read required module metadata.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { BarrelCodegenError } from "@effect/utils/Codegen"` and use `BarrelCodegenError`.
- **Suggested snippet:** Create or capture `BarrelCodegenError` through the public operation that produces it, then assert its tag and one stable semantic field such as the input, path, or reason. Avoid stack traces and rendered message snapshots.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/utils/Codegen.BarrelGenerator (value)`

- **Source:** `packages/tools/utils/src/Codegen.ts:138`
- **Kind / category:** `root-declaration` / `services`
- **Priority:** **recommended**
- **Current description:** Service tag for barrel file generation.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { BarrelGenerator } from "@effect/utils/Codegen"` and use `BarrelGenerator`.
- **Suggested snippet:** Consume `BarrelGenerator` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/utils/Codegen.layer`

- **Source:** `packages/tools/utils/src/Codegen.ts:148`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Builds the `BarrelGenerator` service, discovering files with `@barrel` annotations and rewriting their generated export sections from matching modules.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { layer } from "@effect/utils/Codegen"` and use `layer`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `layer`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `@effect/utils/Codegen.BarrelFile`

- **Source:** `packages/tools/utils/src/Codegen.ts:112`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Metadata for a barrel file discovered from a `@barrel` annotation, including the file path, glob pattern, and insertion offset for generated exports.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/utils/Codegen.BarrelFile`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/utils/Codegen.BarrelGenerator (type)`

- **Source:** `packages/tools/utils/src/Codegen.ts:124`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Service interface for discovering annotated barrel files and regenerating their export contents.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/utils/Codegen.BarrelGenerator`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.
