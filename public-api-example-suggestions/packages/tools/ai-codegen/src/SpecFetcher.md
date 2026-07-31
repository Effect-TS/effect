# Example Suggestions: `@effect/ai-codegen/SpecFetcher`

- **Package:** `@effect/ai-codegen`
- **Source:** `packages/tools/ai-codegen/src/SpecFetcher.ts`
- **Uncovered API records:** 3
- **Priorities:** 0 required, 2 recommended, 1 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                  | Line | Kind               | Priority        |
| ---------------------------------------------------- | ---: | ------------------ | --------------- |
| `@effect/ai-codegen/SpecFetcher.layer`               |   72 | `root-declaration` | **recommended** |
| `@effect/ai-codegen/SpecFetcher.SpecFetcher (value)` |   62 | `root-declaration` | **recommended** |
| `@effect/ai-codegen/SpecFetcher.SpecFetcher (type)`  |   49 | `root-declaration` | **optional**    |

## Recommended

### `@effect/ai-codegen/SpecFetcher.layer`

- **Source:** `packages/tools/ai-codegen/src/SpecFetcher.ts:72`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Layer providing the SpecFetcher service.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { layer } from "@effect/ai-codegen/SpecFetcher"` and use `layer`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `layer`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/ai-codegen/SpecFetcher.SpecFetcher (value)`

- **Source:** `packages/tools/ai-codegen/src/SpecFetcher.ts:62`
- **Kind / category:** `root-declaration` / `services`
- **Priority:** **recommended**
- **Current description:** Service tag for fetching OpenAPI specifications from configured sources.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { SpecFetcher } from "@effect/ai-codegen/SpecFetcher"` and use `SpecFetcher`.
- **Suggested snippet:** Consume `SpecFetcher` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `@effect/ai-codegen/SpecFetcher.SpecFetcher (type)`

- **Source:** `packages/tools/ai-codegen/src/SpecFetcher.ts:49`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Service for fetching OpenAPI specifications.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/ai-codegen/SpecFetcher.SpecFetcher`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.
