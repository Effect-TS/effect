# Example Suggestions: `effect/JsonSchema`

- **Package:** `effect`
- **Source:** `packages/effect/src/JsonSchema.ts`
- **Uncovered API records:** 7
- **Priorities:** 0 required, 2 recommended, 5 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                               | Line | Kind               | Priority        |
| ------------------------------------------------- | ---: | ------------------ | --------------- |
| `effect/JsonSchema.META_SCHEMA_URI_DRAFT_07`      |  180 | `root-declaration` | **recommended** |
| `effect/JsonSchema.META_SCHEMA_URI_DRAFT_2020_12` |  200 | `root-declaration` | **recommended** |
| `effect/JsonSchema.JsonSchema`                    |   32 | `root-declaration` | **optional**    |
| `effect/JsonSchema.Dialect`                       |   56 | `root-declaration` | **optional**    |
| `effect/JsonSchema.Type`                          |   68 | `root-declaration` | **optional**    |
| `effect/JsonSchema.Definitions`                   |   90 | `root-declaration` | **optional**    |
| `effect/JsonSchema.MultiDocument`                 |  156 | `root-declaration` | **optional**    |

## Recommended

### `effect/JsonSchema.META_SCHEMA_URI_DRAFT_07`

- **Source:** `packages/effect/src/JsonSchema.ts:180`
- **Kind / category:** `root-declaration` / `constants`
- **Priority:** **recommended**
- **Current description:** Represents the `$schema` meta-schema URI for JSON Schema Draft-07.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { JsonSchema } from "effect"` and use `JsonSchema.META_SCHEMA_URI_DRAFT_07`.
- **Suggested snippet:** Use `JsonSchema.META_SCHEMA_URI_DRAFT_07` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/JsonSchema.META_SCHEMA_URI_DRAFT_2020_12`

- **Source:** `packages/effect/src/JsonSchema.ts:200`
- **Kind / category:** `root-declaration` / `constants`
- **Priority:** **recommended**
- **Current description:** Represents the `$schema` meta-schema URI for JSON Schema Draft 2020-12.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { JsonSchema } from "effect"` and use `JsonSchema.META_SCHEMA_URI_DRAFT_2020_12`.
- **Suggested snippet:** Use `JsonSchema.META_SCHEMA_URI_DRAFT_2020_12` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `effect/JsonSchema.JsonSchema`

- **Source:** `packages/effect/src/JsonSchema.ts:32`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** A plain object representing a single JSON Schema node.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/JsonSchema.JsonSchema`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/JsonSchema.Dialect`

- **Source:** `packages/effect/src/JsonSchema.ts:56`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** The set of JSON Schema dialects supported by this module.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/JsonSchema.Dialect`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/JsonSchema.Type`

- **Source:** `packages/effect/src/JsonSchema.ts:68`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** The JSON Schema primitive type names.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/JsonSchema.Type`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/JsonSchema.Definitions`

- **Source:** `packages/effect/src/JsonSchema.ts:90`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** A record of named JSON Schema definitions, keyed by definition name.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/JsonSchema.Definitions`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/JsonSchema.MultiDocument`

- **Source:** `packages/effect/src/JsonSchema.ts:156`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Like `Document`, but carries multiple root schemas that share a single definitions pool.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/JsonSchema.MultiDocument`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.
