# Example Suggestions: `@effect/ai-codegen/Config`

- **Package:** `@effect/ai-codegen`
- **Source:** `packages/tools/ai-codegen/src/Config.ts`
- **Uncovered API records:** 14
- **Priorities:** 0 required, 0 recommended, 14 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                                         | Line | Kind                    | Priority     |
| --------------------------------------------------------------------------- | ---: | ----------------------- | ------------ |
| `@effect/ai-codegen/Config.SpecSourceConfig`                                |   27 | `root-declaration`      | **optional** |
| `@effect/ai-codegen/Config.Replacement`                                     |   16 | `root-declaration`      | **optional** |
| `@effect/ai-codegen/Config.CodegenConfig.clientName`                        |   69 | `member`                | **optional** |
| `@effect/ai-codegen/Config.CodegenConfig.isTypeOnly`                        |   78 | `member`                | **optional** |
| `@effect/ai-codegen/Config.CodegenConfig.patchList`                         |   87 | `member`                | **optional** |
| `@effect/ai-codegen/Config.CodegenConfig.replacementList`                   |   96 | `member`                | **optional** |
| `@effect/ai-codegen/Config.CodegenConfig.headerContent`                     |  105 | `member`                | **optional** |
| `@effect/ai-codegen/Config.CodegenConfig.excludeAnnotationsList`            |  114 | `member`                | **optional** |
| `@effect/ai-codegen/Config.CodegenConfig.shouldDisableAdditionalProperties` |  123 | `member`                | **optional** |
| `@effect/ai-codegen/Config.SpecSource (type) (type)`                        |  134 | `root-declaration`      | **optional** |
| `@effect/ai-codegen/Config.SpecSource (type) (type)`                        |  141 | `namespace`             | **optional** |
| `@effect/ai-codegen/Config.SpecSource.Url`                                  |  148 | `namespace-declaration` | **optional** |
| `@effect/ai-codegen/Config.SpecSource.File`                                 |  159 | `namespace-declaration` | **optional** |
| `@effect/ai-codegen/Config.SpecSource.StainlessStats`                       |  170 | `namespace-declaration` | **optional** |

## Optional

### `@effect/ai-codegen/Config.SpecSourceConfig`

- **Source:** `packages/tools/ai-codegen/src/Config.ts:27`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **optional**
- **Current description:** Structured spec source configuration for Stainless stats indirection.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { SpecSourceConfig } from "@effect/ai-codegen/Config"` and use `SpecSourceConfig`.
- **Suggested snippet:** Use `SpecSourceConfig` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-codegen/Config.Replacement`

- **Source:** `packages/tools/ai-codegen/src/Config.ts:16`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** A text replacement to apply to generated code.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Replacement } from "@effect/ai-codegen/Config"` and use `Replacement`.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `Replacement`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-codegen/Config.CodegenConfig.clientName`

- **Source:** `packages/tools/ai-codegen/src/Config.ts:69`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Get the client name, defaulting to "Client" if not specified.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `@effect/ai-codegen/Config.CodegenConfig.clientName` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-codegen/Config.CodegenConfig.isTypeOnly`

- **Source:** `packages/tools/ai-codegen/src/Config.ts:78`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Check if type-only generation is enabled.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `@effect/ai-codegen/Config.CodegenConfig.isTypeOnly` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-codegen/Config.CodegenConfig.patchList`

- **Source:** `packages/tools/ai-codegen/src/Config.ts:87`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Get the list of patch files/strings to apply.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `@effect/ai-codegen/Config.CodegenConfig.patchList` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-codegen/Config.CodegenConfig.replacementList`

- **Source:** `packages/tools/ai-codegen/src/Config.ts:96`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Get the list of text replacements to apply.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `@effect/ai-codegen/Config.CodegenConfig.replacementList` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-codegen/Config.CodegenConfig.headerContent`

- **Source:** `packages/tools/ai-codegen/src/Config.ts:105`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Get the header content to prepend to generated files.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `@effect/ai-codegen/Config.CodegenConfig.headerContent` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Optional contrast:** Include the absent or empty input only when it teaches a distinct return value.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-codegen/Config.CodegenConfig.excludeAnnotationsList`

- **Source:** `packages/tools/ai-codegen/src/Config.ts:114`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Get the list of annotation keys to exclude from generated code.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `@effect/ai-codegen/Config.CodegenConfig.excludeAnnotationsList` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-codegen/Config.CodegenConfig.shouldDisableAdditionalProperties`

- **Source:** `packages/tools/ai-codegen/src/Config.ts:123`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Check if additionalProperties should be forced to false on all object schemas.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `@effect/ai-codegen/Config.CodegenConfig.shouldDisableAdditionalProperties` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-codegen/Config.SpecSource (type) (type)`

- **Source:** `packages/tools/ai-codegen/src/Config.ts:134`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Represents the source of an OpenAPI specification.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/ai-codegen/Config.SpecSource (type)`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-codegen/Config.SpecSource (type) (type)`

- **Source:** `packages/tools/ai-codegen/src/Config.ts:141`
- **Kind / category:** `namespace` / `none`
- **Priority:** **optional**
- **Current description:** Namespace containing the supported OpenAPI specification source variants.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/ai-codegen/Config.SpecSource (type)`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-codegen/Config.SpecSource.Url`

- **Source:** `packages/tools/ai-codegen/src/Config.ts:148`
- **Kind / category:** `namespace-declaration` / `models`
- **Priority:** **optional**
- **Current description:** A URL-based spec source.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/ai-codegen/Config.SpecSource.Url`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-codegen/Config.SpecSource.File`

- **Source:** `packages/tools/ai-codegen/src/Config.ts:159`
- **Kind / category:** `namespace-declaration` / `models`
- **Priority:** **optional**
- **Current description:** A file-based spec source.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/ai-codegen/Config.SpecSource.File`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/ai-codegen/Config.SpecSource.StainlessStats`

- **Source:** `packages/tools/ai-codegen/src/Config.ts:170`
- **Kind / category:** `namespace-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Stainless SDK stats.yml indirection - fetches stats file and extracts openapi_spec_url.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/ai-codegen/Config.SpecSource.StainlessStats`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.
