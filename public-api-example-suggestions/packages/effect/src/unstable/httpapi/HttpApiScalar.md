# Example Suggestions: `effect/unstable/httpapi/HttpApiScalar`

- **Package:** `effect`
- **Source:** `packages/effect/src/unstable/httpapi/HttpApiScalar.ts`
- **Uncovered API records:** 21
- **Priorities:** 0 required, 2 recommended, 19 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                                        | Line | Kind               | Priority        |
| -------------------------------------------------------------------------- | ---: | ------------------ | --------------- |
| `effect/unstable/httpapi/HttpApiScalar.layer`                              |  209 | `root-declaration` | **recommended** |
| `effect/unstable/httpapi/HttpApiScalar.layerCdn`                           |  240 | `root-declaration` | **recommended** |
| `effect/unstable/httpapi/HttpApiScalar.ScalarThemeId`                      |   27 | `root-declaration` | **optional**    |
| `effect/unstable/httpapi/HttpApiScalar.ScalarConfig`                       |   52 | `root-declaration` | **optional**    |
| `effect/unstable/httpapi/HttpApiScalar.ScalarConfig.theme`                 |   54 | `member`           | **optional**    |
| `effect/unstable/httpapi/HttpApiScalar.ScalarConfig.layout`                |   56 | `member`           | **optional**    |
| `effect/unstable/httpapi/HttpApiScalar.ScalarConfig.proxyUrl`              |   58 | `member`           | **optional**    |
| `effect/unstable/httpapi/HttpApiScalar.ScalarConfig.customFetch`           |   60 | `member`           | **optional**    |
| `effect/unstable/httpapi/HttpApiScalar.ScalarConfig.showSidebar`           |   62 | `member`           | **optional**    |
| `effect/unstable/httpapi/HttpApiScalar.ScalarConfig.hideModels`            |   68 | `member`           | **optional**    |
| `effect/unstable/httpapi/HttpApiScalar.ScalarConfig.hideTestRequestButton` |   74 | `member`           | **optional**    |
| `effect/unstable/httpapi/HttpApiScalar.ScalarConfig.hideSearch`            |   80 | `member`           | **optional**    |
| `effect/unstable/httpapi/HttpApiScalar.ScalarConfig.darkMode`              |   82 | `member`           | **optional**    |
| `effect/unstable/httpapi/HttpApiScalar.ScalarConfig.forceDarkModeState`    |   84 | `member`           | **optional**    |
| `effect/unstable/httpapi/HttpApiScalar.ScalarConfig.hideDarkModeToggle`    |   86 | `member`           | **optional**    |
| `effect/unstable/httpapi/HttpApiScalar.ScalarConfig.favicon`               |   92 | `member`           | **optional**    |
| `effect/unstable/httpapi/HttpApiScalar.ScalarConfig.customCss`             |   94 | `member`           | **optional**    |
| `effect/unstable/httpapi/HttpApiScalar.ScalarConfig.baseServerURL`         |  106 | `member`           | **optional**    |
| `effect/unstable/httpapi/HttpApiScalar.ScalarConfig.withDefaultFonts`      |  116 | `member`           | **optional**    |
| `effect/unstable/httpapi/HttpApiScalar.ScalarConfig.defaultOpenAllTags`    |  123 | `member`           | **optional**    |
| `effect/unstable/httpapi/HttpApiScalar.ScalarConfig.showOperationId`       |  129 | `member`           | **optional**    |

## Recommended

### `effect/unstable/httpapi/HttpApiScalar.layer`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiScalar.ts:209`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Mounts a Scalar API reference page for an `HttpApi` using the bundled Scalar script.
- **Signature hint:** `declare function layer<Id extends string, Groups extends HttpApiGroup.Constraint>(api: HttpApi.HttpApi<Id, Groups>, options?: { readonly path?: '/${string}' | undefined; readonly scalar?: ScalarConfig; } | undefined): Layer.Layer<never, never, HttpRouter.HttpRouter>`
- **Import guidance:** Start from `import { HttpApiScalar } from "effect/unstable/httpapi"` and use `HttpApiScalar.layer`.
- **Suggested snippet:** Use the public setup or registry consumed by `HttpApiScalar.layer`, apply the layer, and assert the registration, migration, route, resource, or other side effect documented by nearby tests. The layer provides no service, so do not write an example that yields a service from context.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/httpapi/HttpApiScalar.layerCdn`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiScalar.ts:240`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Mounts a Scalar API reference page for an `HttpApi` that loads Scalar from jsDelivr.
- **Signature hint:** `declare function layerCdn<Id extends string, Groups extends HttpApiGroup.Constraint>(api: HttpApi.HttpApi<Id, Groups>, options?: { readonly path?: '/${string}' | undefined; readonly scalar?: ScalarConfig; readonly version?: string | undefined; } | undefined): Layer.Layer<never, never, HttpRouter.HttpRouter>`
- **Import guidance:** Start from `import { HttpApiScalar } from "effect/unstable/httpapi"` and use `HttpApiScalar.layerCdn`.
- **Suggested snippet:** Use the public setup or registry consumed by `HttpApiScalar.layerCdn`, apply the layer, and assert the registration, migration, route, resource, or other side effect documented by nearby tests. The layer provides no service, so do not write an example that yields a service from context.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `effect/unstable/httpapi/HttpApiScalar.ScalarThemeId`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiScalar.ts:27`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Theme preset identifier accepted by the Scalar API reference UI.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/httpapi/HttpApiScalar.ScalarThemeId`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/HttpApiScalar.ScalarConfig`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiScalar.ts:52`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Configuration passed to the embedded Scalar API reference UI.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/httpapi/HttpApiScalar.ScalarConfig`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/HttpApiScalar.ScalarConfig.theme`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiScalar.ts:54`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** A string to use one of the color presets
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/httpapi/HttpApiScalar.ScalarConfig.theme` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/HttpApiScalar.ScalarConfig.layout`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiScalar.ts:56`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The layout to use for the references
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/httpapi/HttpApiScalar.ScalarConfig.layout` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/HttpApiScalar.ScalarConfig.proxyUrl`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiScalar.ts:58`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** URL to a request proxy for the API client
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/httpapi/HttpApiScalar.ScalarConfig.proxyUrl` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/HttpApiScalar.ScalarConfig.customFetch`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiScalar.ts:60`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Browser JavaScript function expression used by Scalar for documents and test requests
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/httpapi/HttpApiScalar.ScalarConfig.customFetch` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/HttpApiScalar.ScalarConfig.showSidebar`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiScalar.ts:62`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Whether to show the sidebar
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/httpapi/HttpApiScalar.ScalarConfig.showSidebar` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/HttpApiScalar.ScalarConfig.hideModels`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiScalar.ts:68`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Whether to show models in the sidebar, search, and content.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/httpapi/HttpApiScalar.ScalarConfig.hideModels` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/HttpApiScalar.ScalarConfig.hideTestRequestButton`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiScalar.ts:74`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Whether to show the "Test Request" button.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/httpapi/HttpApiScalar.ScalarConfig.hideTestRequestButton` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/HttpApiScalar.ScalarConfig.hideSearch`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiScalar.ts:80`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Whether to show the sidebar search bar.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/httpapi/HttpApiScalar.ScalarConfig.hideSearch` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/HttpApiScalar.ScalarConfig.darkMode`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiScalar.ts:82`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Whether dark mode is on or off initially (light mode)
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/httpapi/HttpApiScalar.ScalarConfig.darkMode` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/HttpApiScalar.ScalarConfig.forceDarkModeState`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiScalar.ts:84`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** forceDarkModeState makes it always this state no matter what
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/httpapi/HttpApiScalar.ScalarConfig.forceDarkModeState` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/HttpApiScalar.ScalarConfig.hideDarkModeToggle`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiScalar.ts:86`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Whether to show the dark mode toggle
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/httpapi/HttpApiScalar.ScalarConfig.hideDarkModeToggle` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/HttpApiScalar.ScalarConfig.favicon`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiScalar.ts:92`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Path to a favicon image.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/httpapi/HttpApiScalar.ScalarConfig.favicon` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/HttpApiScalar.ScalarConfig.customCss`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiScalar.ts:94`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Custom CSS to be added to the page
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/httpapi/HttpApiScalar.ScalarConfig.customCss` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/HttpApiScalar.ScalarConfig.baseServerURL`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiScalar.ts:106`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Origin used when the OpenAPI document contains relative server URLs and is rendered during SSR.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/httpapi/HttpApiScalar.ScalarConfig.baseServerURL` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/HttpApiScalar.ScalarConfig.withDefaultFonts`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiScalar.ts:116`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Whether Scalar loads its default Inter and JetBrains Mono fonts.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/httpapi/HttpApiScalar.ScalarConfig.withDefaultFonts` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/HttpApiScalar.ScalarConfig.defaultOpenAllTags`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiScalar.ts:123`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Whether all tags are open by default instead of only the tag matching the current URL.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/httpapi/HttpApiScalar.ScalarConfig.defaultOpenAllTags` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/HttpApiScalar.ScalarConfig.showOperationId`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiScalar.ts:129`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Whether to display the operation ID in the operation reference.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/httpapi/HttpApiScalar.ScalarConfig.showOperationId` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.
