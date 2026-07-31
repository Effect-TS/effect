# Example Suggestions: `@effect/openapi-generator/ParsedOperation`

- **Package:** `@effect/openapi-generator`
- **Source:** `packages/tools/openapi-generator/src/ParsedOperation.ts`
- **Uncovered API records:** 13
- **Priorities:** 0 required, 0 recommended, 13 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                                            | Line | Kind               | Priority     |
| ------------------------------------------------------------------------------ | ---: | ------------------ | ------------ |
| `@effect/openapi-generator/ParsedOperation.makeDeepMutable`                    |  235 | `root-declaration` | **optional** |
| `@effect/openapi-generator/ParsedOperation.ParsedOpenApiMetadata`              |   28 | `root-declaration` | **optional** |
| `@effect/openapi-generator/ParsedOperation.ParsedOpenApiTag`                   |   43 | `root-declaration` | **optional** |
| `@effect/openapi-generator/ParsedOperation.ParsedOpenApiSecurityScheme`        |   55 | `root-declaration` | **optional** |
| `@effect/openapi-generator/ParsedOperation.ParsedOpenApi`                      |   71 | `root-declaration` | **optional** |
| `@effect/openapi-generator/ParsedOperation.ParsedOperationMetadata`            |   84 | `root-declaration` | **optional** |
| `@effect/openapi-generator/ParsedOperation.ParsedOperationParameter`           |   97 | `root-declaration` | **optional** |
| `@effect/openapi-generator/ParsedOperation.ParsedOperationRequestBody`         |  111 | `root-declaration` | **optional** |
| `@effect/openapi-generator/ParsedOperation.ParsedOperationMediaTypeEncoding`   |  122 | `root-declaration` | **optional** |
| `@effect/openapi-generator/ParsedOperation.ParsedOperationMediaTypeSchema`     |  135 | `root-declaration` | **optional** |
| `@effect/openapi-generator/ParsedOperation.ParsedOperationResponse`            |  162 | `root-declaration` | **optional** |
| `@effect/openapi-generator/ParsedOperation.ParsedOperationSecurityRequirement` |  177 | `root-declaration` | **optional** |
| `@effect/openapi-generator/ParsedOperation.ParsedOperation`                    |  185 | `root-declaration` | **optional** |

## Optional

### `@effect/openapi-generator/ParsedOperation.makeDeepMutable`

- **Source:** `packages/tools/openapi-generator/src/ParsedOperation.ts:235`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Creates a mutable operation accumulator populated with parser defaults.
- **Signature hint:** `declare function makeDeepMutable(options: { readonly id: string; readonly method: OpenAPISpecMethodName; readonly pathIds: Array<string>; readonly pathTemplate: string; readonly description: string | undefined; }): Types.DeepMutable<ParsedOperation>`
- **Import guidance:** Start from `import { makeDeepMutable } from "@effect/openapi-generator/ParsedOperation"` and use `makeDeepMutable`.
- **Suggested snippet:** Construct one representative value with `makeDeepMutable`, then pass it to the smallest canonical getter, matcher, or runner that exposes what was created. Do not merely assert an object kind.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/openapi-generator/ParsedOperation.ParsedOpenApiMetadata`

- **Source:** `packages/tools/openapi-generator/src/ParsedOperation.ts:28`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Root OpenAPI metadata preserved for generated client and HttpApi output.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/openapi-generator/ParsedOperation.ParsedOpenApiMetadata`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/openapi-generator/ParsedOperation.ParsedOpenApiTag`

- **Source:** `packages/tools/openapi-generator/src/ParsedOperation.ts:43`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Tag metadata used to group and annotate generated operations.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/openapi-generator/ParsedOperation.ParsedOpenApiTag`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/openapi-generator/ParsedOperation.ParsedOpenApiSecurityScheme`

- **Source:** `packages/tools/openapi-generator/src/ParsedOperation.ts:55`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Supported security scheme extracted from an OpenAPI components section.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/openapi-generator/ParsedOperation.ParsedOpenApiSecurityScheme`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/openapi-generator/ParsedOperation.ParsedOpenApi`

- **Source:** `packages/tools/openapi-generator/src/ParsedOperation.ts:71`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Normalized OpenAPI document consumed by the generator renderers.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/openapi-generator/ParsedOperation.ParsedOpenApi`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/openapi-generator/ParsedOperation.ParsedOperationMetadata`

- **Source:** `packages/tools/openapi-generator/src/ParsedOperation.ts:84`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Documentation and lifecycle metadata associated with an operation.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/openapi-generator/ParsedOperation.ParsedOperationMetadata`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/openapi-generator/ParsedOperation.ParsedOperationParameter`

- **Source:** `packages/tools/openapi-generator/src/ParsedOperation.ts:97`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Resolved OpenAPI parameter grouped by where it appears in the request.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/openapi-generator/ParsedOperation.ParsedOperationParameter`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/openapi-generator/ParsedOperation.ParsedOperationRequestBody`

- **Source:** `packages/tools/openapi-generator/src/ParsedOperation.ts:111`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Summary of the request body declaration before per-media schemas are rendered.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/openapi-generator/ParsedOperation.ParsedOperationRequestBody`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/openapi-generator/ParsedOperation.ParsedOperationMediaTypeEncoding`

- **Source:** `packages/tools/openapi-generator/src/ParsedOperation.ts:122`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Encoding strategy the generator can use for a request or response media type.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/openapi-generator/ParsedOperation.ParsedOperationMediaTypeEncoding`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/openapi-generator/ParsedOperation.ParsedOperationMediaTypeSchema`

- **Source:** `packages/tools/openapi-generator/src/ParsedOperation.ts:135`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Media type whose schema can be represented in generated Effect code.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/openapi-generator/ParsedOperation.ParsedOperationMediaTypeSchema`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/openapi-generator/ParsedOperation.ParsedOperationResponse`

- **Source:** `packages/tools/openapi-generator/src/ParsedOperation.ts:162`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Parsed response metadata together with generated schema references.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/openapi-generator/ParsedOperation.ParsedOperationResponse`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/openapi-generator/ParsedOperation.ParsedOperationSecurityRequirement`

- **Source:** `packages/tools/openapi-generator/src/ParsedOperation.ts:177`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Resolved security requirement applied to a parsed operation.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/openapi-generator/ParsedOperation.ParsedOperationSecurityRequirement`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/openapi-generator/ParsedOperation.ParsedOperation`

- **Source:** `packages/tools/openapi-generator/src/ParsedOperation.ts:185`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Normalized operation model shared by all OpenAPI generator backends.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/openapi-generator/ParsedOperation.ParsedOperation`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.
