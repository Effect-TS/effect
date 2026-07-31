# Example Suggestions: `@effect/openapi-generator/JsonSchemaGenerator`

- **Package:** `@effect/openapi-generator`
- **Source:** `packages/tools/openapi-generator/src/JsonSchemaGenerator.ts`
- **Uncovered API records:** 1
- **Priorities:** 0 required, 1 recommended, 0 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                  | Line | Kind               | Priority        |
| ---------------------------------------------------- | ---: | ------------------ | --------------- |
| `@effect/openapi-generator/JsonSchemaGenerator.make` |   52 | `root-declaration` | **recommended** |

## Recommended

### `@effect/openapi-generator/JsonSchemaGenerator.make`

- **Source:** `packages/tools/openapi-generator/src/JsonSchemaGenerator.ts:52`
- **Kind / category:** `root-declaration` / `code generation`
- **Priority:** **recommended**
- **Current description:** Create a stateful JSON Schema code generator for OpenAPI-derived schemas.
- **Signature hint:** `declare function make(): { readonly addSchema: (name: string, schema: JsonSchema.JsonSchema) => string; readonly generate: (source: Source, components: JsonSchema.Definitions, typeOnly: boolean, options?: GenerateOptions) => string; readonly generateHttpApi: (source: Source, components: JsonSchema.Definitions, options?: GenerateHttpApiOptions) => string; }`
- **Import guidance:** Start from `import { make } from "@effect/openapi-generator/JsonSchemaGenerator"` and use `make`.
- **Suggested snippet:** Construct one representative value with `make`, then pass it to the smallest canonical getter, matcher, or runner that exposes what was created. Do not merely assert an object kind.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.
