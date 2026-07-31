# Example Suggestions: `@effect/openapi-generator/OpenApiGenerator`

- **Package:** `@effect/openapi-generator`
- **Source:** `packages/tools/openapi-generator/src/OpenApiGenerator.ts`
- **Uncovered API records:** 12
- **Priorities:** 0 required, 4 recommended, 8 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                                           | Line | Kind               | Priority        |
| ----------------------------------------------------------------------------- | ---: | ------------------ | --------------- |
| `@effect/openapi-generator/OpenApiGenerator.layerTransformerSchema`           | 1218 | `root-declaration` | **recommended** |
| `@effect/openapi-generator/OpenApiGenerator.layerTransformerTs`               | 1226 | `root-declaration` | **recommended** |
| `@effect/openapi-generator/OpenApiGenerator.OpenApiGenerator`                 |   35 | `root-declaration` | **recommended** |
| `@effect/openapi-generator/OpenApiGenerator.make`                             |  127 | `root-declaration` | **recommended** |
| `@effect/openapi-generator/OpenApiGenerator.OpenApiGenerateOptions`           |   86 | `root-declaration` | **optional**    |
| `@effect/openapi-generator/OpenApiGenerator.OpenApiGeneratorFormat`           |   46 | `root-declaration` | **optional**    |
| `@effect/openapi-generator/OpenApiGenerator.OpenApiGeneratorWarningCode`      |   54 | `root-declaration` | **optional**    |
| `@effect/openapi-generator/OpenApiGenerator.OpenApiGeneratorWarning`          |   72 | `root-declaration` | **optional**    |
| `@effect/openapi-generator/OpenApiGenerator.OpenApiGenerateOptions.name`      |   90 | `member`           | **optional**    |
| `@effect/openapi-generator/OpenApiGenerator.OpenApiGenerateOptions.format`    |   94 | `member`           | **optional**    |
| `@effect/openapi-generator/OpenApiGenerator.OpenApiGenerateOptions.onEnter`   |   98 | `member`           | **optional**    |
| `@effect/openapi-generator/OpenApiGenerator.OpenApiGenerateOptions.onWarning` |  102 | `member`           | **optional**    |

## Recommended

### `@effect/openapi-generator/OpenApiGenerator.layerTransformerSchema`

- **Source:** `packages/tools/openapi-generator/src/OpenApiGenerator.ts:1218`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Layer providing an OpenAPI generator for Schema-backed HTTP client and HttpApi output.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { layerTransformerSchema } from "@effect/openapi-generator/OpenApiGenerator"` and use `layerTransformerSchema`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `layerTransformerSchema`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/openapi-generator/OpenApiGenerator.layerTransformerTs`

- **Source:** `packages/tools/openapi-generator/src/OpenApiGenerator.ts:1226`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Layer providing an OpenAPI generator for type-only HTTP client output.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { layerTransformerTs } from "@effect/openapi-generator/OpenApiGenerator"` and use `layerTransformerTs`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `layerTransformerTs`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/openapi-generator/OpenApiGenerator.OpenApiGenerator`

- **Source:** `packages/tools/openapi-generator/src/OpenApiGenerator.ts:35`
- **Kind / category:** `root-declaration` / `services`
- **Priority:** **recommended**
- **Current description:** Service for turning OpenAPI or Swagger specifications into generated Effect HTTP client or HttpApi source code.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { OpenApiGenerator } from "@effect/openapi-generator/OpenApiGenerator"` and use `OpenApiGenerator`.
- **Suggested snippet:** Consume `OpenApiGenerator` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/openapi-generator/OpenApiGenerator.make`

- **Source:** `packages/tools/openapi-generator/src/OpenApiGenerator.ts:127`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Constructs the OpenAPI generator service implementation.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { make } from "@effect/openapi-generator/OpenApiGenerator"` and use `make`.
- **Suggested snippet:** Construct one representative value with `make`, then pass it to the smallest canonical getter, matcher, or runner that exposes what was created. Do not merely assert an object kind.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `@effect/openapi-generator/OpenApiGenerator.OpenApiGenerateOptions`

- **Source:** `packages/tools/openapi-generator/src/OpenApiGenerator.ts:86`
- **Kind / category:** `root-declaration` / `options`
- **Priority:** **optional**
- **Current description:** Options that control one OpenAPI generation run.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/openapi-generator/OpenApiGenerator.OpenApiGenerateOptions`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/openapi-generator/OpenApiGenerator.OpenApiGeneratorFormat`

- **Source:** `packages/tools/openapi-generator/src/OpenApiGenerator.ts:46`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Output targets supported by the OpenAPI generator.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/openapi-generator/OpenApiGenerator.OpenApiGeneratorFormat`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/openapi-generator/OpenApiGenerator.OpenApiGeneratorWarningCode`

- **Source:** `packages/tools/openapi-generator/src/OpenApiGenerator.ts:54`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Stable identifiers for non-fatal OpenAPI generation warnings.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/openapi-generator/OpenApiGenerator.OpenApiGeneratorWarningCode`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/openapi-generator/OpenApiGenerator.OpenApiGeneratorWarning`

- **Source:** `packages/tools/openapi-generator/src/OpenApiGenerator.ts:72`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Describes a non-fatal issue encountered while mapping an OpenAPI operation to generated Effect source.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/openapi-generator/OpenApiGenerator.OpenApiGeneratorWarning`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/openapi-generator/OpenApiGenerator.OpenApiGenerateOptions.name`

- **Source:** `packages/tools/openapi-generator/src/OpenApiGenerator.ts:90`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The name to give to the generated output.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `@effect/openapi-generator/OpenApiGenerator.OpenApiGenerateOptions.name` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/openapi-generator/OpenApiGenerator.OpenApiGenerateOptions.format`

- **Source:** `packages/tools/openapi-generator/src/OpenApiGenerator.ts:94`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The output format to generate.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `@effect/openapi-generator/OpenApiGenerator.OpenApiGenerateOptions.format` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/openapi-generator/OpenApiGenerator.OpenApiGenerateOptions.onEnter`

- **Source:** `packages/tools/openapi-generator/src/OpenApiGenerator.ts:98`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Hook to transform each JSON Schema node before processing.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `@effect/openapi-generator/OpenApiGenerator.OpenApiGenerateOptions.onEnter` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/openapi-generator/OpenApiGenerator.OpenApiGenerateOptions.onWarning`

- **Source:** `packages/tools/openapi-generator/src/OpenApiGenerator.ts:102`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Callback to receive non-fatal generation warnings.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `@effect/openapi-generator/OpenApiGenerator.OpenApiGenerateOptions.onWarning` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.
