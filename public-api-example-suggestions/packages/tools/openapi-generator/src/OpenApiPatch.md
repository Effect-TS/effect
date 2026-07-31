# Example Suggestions: `@effect/openapi-generator/OpenApiPatch`

- **Package:** `@effect/openapi-generator`
- **Source:** `packages/tools/openapi-generator/src/OpenApiPatch.ts`
- **Uncovered API records:** 5
- **Priorities:** 0 required, 3 recommended, 2 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                         | Line | Kind               | Priority        |
| ----------------------------------------------------------- | ---: | ------------------ | --------------- |
| `@effect/openapi-generator/OpenApiPatch.JsonPatchAdd`       |  207 | `root-declaration` | **recommended** |
| `@effect/openapi-generator/OpenApiPatch.JsonPatchRemove`    |  225 | `root-declaration` | **recommended** |
| `@effect/openapi-generator/OpenApiPatch.JsonPatchReplace`   |  242 | `root-declaration` | **recommended** |
| `@effect/openapi-generator/OpenApiPatch.JsonPatchOperation` |  265 | `root-declaration` | **optional**    |
| `@effect/openapi-generator/OpenApiPatch.JsonPatchDocument`  |  306 | `root-declaration` | **optional**    |

## Recommended

### `@effect/openapi-generator/OpenApiPatch.JsonPatchAdd`

- **Source:** `packages/tools/openapi-generator/src/OpenApiPatch.ts:207`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **recommended**
- **Current description:** Schema for a JSON Patch "add" operation.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { JsonPatchAdd } from "@effect/openapi-generator/OpenApiPatch"` and use `JsonPatchAdd`.
- **Suggested snippet:** Use `JsonPatchAdd` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/openapi-generator/OpenApiPatch.JsonPatchRemove`

- **Source:** `packages/tools/openapi-generator/src/OpenApiPatch.ts:225`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **recommended**
- **Current description:** Schema for a JSON Patch "remove" operation.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { JsonPatchRemove } from "@effect/openapi-generator/OpenApiPatch"` and use `JsonPatchRemove`.
- **Suggested snippet:** Use `JsonPatchRemove` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/openapi-generator/OpenApiPatch.JsonPatchReplace`

- **Source:** `packages/tools/openapi-generator/src/OpenApiPatch.ts:242`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **recommended**
- **Current description:** Schema for a JSON Patch "replace" operation.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { JsonPatchReplace } from "@effect/openapi-generator/OpenApiPatch"` and use `JsonPatchReplace`.
- **Suggested snippet:** Use `JsonPatchReplace` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `@effect/openapi-generator/OpenApiPatch.JsonPatchOperation`

- **Source:** `packages/tools/openapi-generator/src/OpenApiPatch.ts:265`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **optional**
- **Current description:** Schema for a single JSON Patch operation.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { JsonPatchOperation } from "@effect/openapi-generator/OpenApiPatch"` and use `JsonPatchOperation`.
- **Suggested snippet:** Use `JsonPatchOperation` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/openapi-generator/OpenApiPatch.JsonPatchDocument`

- **Source:** `packages/tools/openapi-generator/src/OpenApiPatch.ts:306`
- **Kind / category:** `root-declaration` / `types`
- **Priority:** **optional**
- **Current description:** Type for a JSON Patch document.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/openapi-generator/OpenApiPatch.JsonPatchDocument`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.
