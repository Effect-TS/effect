# Example Suggestions: `@effect/openapi-generator/OpenApiTransformer`

- **Package:** `@effect/openapi-generator`
- **Source:** `packages/tools/openapi-generator/src/OpenApiTransformer.ts`
- **Uncovered API records:** 5
- **Priorities:** 0 required, 4 recommended, 1 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                                   | Line | Kind               | Priority        |
| --------------------------------------------------------------------- | ---: | ------------------ | --------------- |
| `@effect/openapi-generator/OpenApiTransformer.layerTransformerSchema` |  483 | `root-declaration` | **recommended** |
| `@effect/openapi-generator/OpenApiTransformer.layerTransformerTs`     |  894 | `root-declaration` | **recommended** |
| `@effect/openapi-generator/OpenApiTransformer.OpenApiTransformer`     |   32 | `root-declaration` | **recommended** |
| `@effect/openapi-generator/OpenApiTransformer.makeTransformerSchema`  |   84 | `root-declaration` | **recommended** |
| `@effect/openapi-generator/OpenApiTransformer.makeTransformerTs`      |  501 | `root-declaration` | **optional**    |

## Recommended

### `@effect/openapi-generator/OpenApiTransformer.layerTransformerSchema`

- **Source:** `packages/tools/openapi-generator/src/OpenApiTransformer.ts:483`
- **Kind / category:** `root-declaration` / `code generation`
- **Priority:** **recommended**
- **Current description:** Layer that provides the schema-backed OpenApiTransformer service.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { layerTransformerSchema } from "@effect/openapi-generator/OpenApiTransformer"` and use `layerTransformerSchema`.
- **Suggested snippet:** Use `layerTransformerSchema` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/openapi-generator/OpenApiTransformer.layerTransformerTs`

- **Source:** `packages/tools/openapi-generator/src/OpenApiTransformer.ts:894`
- **Kind / category:** `root-declaration` / `code generation`
- **Priority:** **recommended**
- **Current description:** Layer that provides the type-only OpenApiTransformer service.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { layerTransformerTs } from "@effect/openapi-generator/OpenApiTransformer"` and use `layerTransformerTs`.
- **Suggested snippet:** Use `layerTransformerTs` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/openapi-generator/OpenApiTransformer.OpenApiTransformer`

- **Source:** `packages/tools/openapi-generator/src/OpenApiTransformer.ts:32`
- **Kind / category:** `root-declaration` / `code generation`
- **Priority:** **recommended**
- **Current description:** Service used by the OpenAPI generator to render parsed operations as an Effect HttpClient module.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { OpenApiTransformer } from "@effect/openapi-generator/OpenApiTransformer"` and use `OpenApiTransformer`.
- **Suggested snippet:** Consume `OpenApiTransformer` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/openapi-generator/OpenApiTransformer.makeTransformerSchema`

- **Source:** `packages/tools/openapi-generator/src/OpenApiTransformer.ts:84`
- **Kind / category:** `root-declaration` / `code generation`
- **Priority:** **recommended**
- **Current description:** Create the transformer used for schema-backed HttpClient output.
- **Signature hint:** `declare function makeTransformerSchema(): { readonly imports: (importName: string, parsed: ParsedOpenApi) => string; readonly toTypes: (importName: string, name: string, parsed: ParsedOpenApi) => string; readonly toImplementation: (importName: string, name: string, parsed: ParsedOpenApi) => string; }`
- **Import guidance:** Start from `import { makeTransformerSchema } from "@effect/openapi-generator/OpenApiTransformer"` and use `makeTransformerSchema`.
- **Suggested snippet:** Construct one representative value with `makeTransformerSchema`, then pass it to the smallest canonical getter, matcher, or runner that exposes what was created. Do not merely assert an object kind.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `@effect/openapi-generator/OpenApiTransformer.makeTransformerTs`

- **Source:** `packages/tools/openapi-generator/src/OpenApiTransformer.ts:501`
- **Kind / category:** `root-declaration` / `code generation`
- **Priority:** **optional**
- **Current description:** Create the transformer used for type-only HttpClient output.
- **Signature hint:** `declare function makeTransformerTs(): { readonly imports: (importName: string, parsed: ParsedOpenApi) => string; readonly toTypes: (importName: string, name: string, parsed: ParsedOpenApi) => string; readonly toImplementation: (importName: string, name: string, parsed: ParsedOpenApi) => string; }`
- **Import guidance:** Start from `import { makeTransformerTs } from "@effect/openapi-generator/OpenApiTransformer"` and use `makeTransformerTs`.
- **Suggested snippet:** Construct one representative value with `makeTransformerTs`, then pass it to the smallest canonical getter, matcher, or runner that exposes what was created. Do not merely assert an object kind.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.
