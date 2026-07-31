# Example Suggestions: `effect/unstable/httpapi/OpenApi`

- **Package:** `effect`
- **Source:** `packages/effect/src/unstable/httpapi/OpenApi.ts`
- **Uncovered API records:** 39
- **Priorities:** 0 required, 0 recommended, 39 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                           | Line | Kind               | Priority     |
| ------------------------------------------------------------- | ---: | ------------------ | ------------ |
| `effect/unstable/httpapi/OpenApi.Identifier`                  |   39 | `root-declaration` | **optional** |
| `effect/unstable/httpapi/OpenApi.Title`                       |   47 | `root-declaration` | **optional** |
| `effect/unstable/httpapi/OpenApi.Version`                     |   55 | `root-declaration` | **optional** |
| `effect/unstable/httpapi/OpenApi.Description`                 |   63 | `root-declaration` | **optional** |
| `effect/unstable/httpapi/OpenApi.License`                     |   71 | `root-declaration` | **optional** |
| `effect/unstable/httpapi/OpenApi.ExternalDocs`                |   79 | `root-declaration` | **optional** |
| `effect/unstable/httpapi/OpenApi.Servers`                     |   89 | `root-declaration` | **optional** |
| `effect/unstable/httpapi/OpenApi.Format`                      |   99 | `root-declaration` | **optional** |
| `effect/unstable/httpapi/OpenApi.Summary`                     |  107 | `root-declaration` | **optional** |
| `effect/unstable/httpapi/OpenApi.Deprecated`                  |  115 | `root-declaration` | **optional** |
| `effect/unstable/httpapi/OpenApi.Override`                    |  123 | `root-declaration` | **optional** |
| `effect/unstable/httpapi/OpenApi.Exclude`                     |  137 | `root-declaration` | **optional** |
| `effect/unstable/httpapi/OpenApi.Transform`                   |  152 | `root-declaration` | **optional** |
| `effect/unstable/httpapi/OpenApi.annotations`                 |  182 | `root-declaration` | **optional** |
| `effect/unstable/httpapi/OpenApi.fromApi`                     |  263 | `root-declaration` | **optional** |
| `effect/unstable/httpapi/OpenApi.OpenAPISpec`                 |  887 | `root-declaration` | **optional** |
| `effect/unstable/httpapi/OpenApi.OpenAPISpecInfo`             |  903 | `root-declaration` | **optional** |
| `effect/unstable/httpapi/OpenApi.OpenAPISpecTag`              |  917 | `root-declaration` | **optional** |
| `effect/unstable/httpapi/OpenApi.OpenAPISpecExternalDocs`     |  929 | `root-declaration` | **optional** |
| `effect/unstable/httpapi/OpenApi.OpenAPISpecLicense`          |  940 | `root-declaration` | **optional** |
| `effect/unstable/httpapi/OpenApi.OpenAPISpecServer`           |  952 | `root-declaration` | **optional** |
| `effect/unstable/httpapi/OpenApi.OpenAPISpecServerVariable`   |  964 | `root-declaration` | **optional** |
| `effect/unstable/httpapi/OpenApi.OpenAPISpecPaths`            |  976 | `root-declaration` | **optional** |
| `effect/unstable/httpapi/OpenApi.OpenAPISpecMethodName`       |  984 | `root-declaration` | **optional** |
| `effect/unstable/httpapi/OpenApi.OpenAPISpecPathItem`         | 1000 | `root-declaration` | **optional** |
| `effect/unstable/httpapi/OpenApi.OpenAPISpecParameter`        | 1010 | `root-declaration` | **optional** |
| `effect/unstable/httpapi/OpenApi.OpenAPISpecResponses`        | 1024 | `root-declaration` | **optional** |
| `effect/unstable/httpapi/OpenApi.OpenApiSpecContent`          | 1032 | `root-declaration` | **optional** |
| `effect/unstable/httpapi/OpenApi.OpenApiSpecResponse`         | 1042 | `root-declaration` | **optional** |
| `effect/unstable/httpapi/OpenApi.OpenApiSpecMediaType`        | 1053 | `root-declaration` | **optional** |
| `effect/unstable/httpapi/OpenApi.OpenApiSpecEffectStream`     | 1064 | `root-declaration` | **optional** |
| `effect/unstable/httpapi/OpenApi.OpenAPISpecRequestBody`      | 1081 | `root-declaration` | **optional** |
| `effect/unstable/httpapi/OpenApi.OpenAPIComponents`           | 1092 | `root-declaration` | **optional** |
| `effect/unstable/httpapi/OpenApi.OpenAPIHTTPSecurityScheme`   | 1103 | `root-declaration` | **optional** |
| `effect/unstable/httpapi/OpenApi.OpenAPIApiKeySecurityScheme` | 1117 | `root-declaration` | **optional** |
| `effect/unstable/httpapi/OpenApi.OpenAPISecurityScheme`       | 1130 | `root-declaration` | **optional** |
| `effect/unstable/httpapi/OpenApi.OpenAPISecurityRequirement`  | 1140 | `root-declaration` | **optional** |
| `effect/unstable/httpapi/OpenApi.OpenAPISpecOperation`        | 1148 | `root-declaration` | **optional** |
| `effect/unstable/httpapi/OpenApi.OpenAPISpecOperation.tags`   | 1153 | `member`           | **optional** |

## Optional

### `effect/unstable/httpapi/OpenApi.Identifier`

- **Source:** `packages/effect/src/unstable/httpapi/OpenApi.ts:39`
- **Kind / category:** `root-declaration` / `annotations`
- **Priority:** **optional**
- **Current description:** OpenAPI annotation for overriding generated identifiers, including operation ids.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { OpenApi } from "effect/unstable/httpapi"` and use `OpenApi.Identifier`.
- **Suggested snippet:** Consume `OpenApi.Identifier` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/OpenApi.Title`

- **Source:** `packages/effect/src/unstable/httpapi/OpenApi.ts:47`
- **Kind / category:** `root-declaration` / `annotations`
- **Priority:** **optional**
- **Current description:** OpenAPI annotation for setting the API title or group tag name.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { OpenApi } from "effect/unstable/httpapi"` and use `OpenApi.Title`.
- **Suggested snippet:** Consume `OpenApi.Title` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/OpenApi.Version`

- **Source:** `packages/effect/src/unstable/httpapi/OpenApi.ts:55`
- **Kind / category:** `root-declaration` / `annotations`
- **Priority:** **optional**
- **Current description:** OpenAPI annotation for setting the generated API version.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { OpenApi } from "effect/unstable/httpapi"` and use `OpenApi.Version`.
- **Suggested snippet:** Consume `OpenApi.Version` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/OpenApi.Description`

- **Source:** `packages/effect/src/unstable/httpapi/OpenApi.ts:63`
- **Kind / category:** `root-declaration` / `annotations`
- **Priority:** **optional**
- **Current description:** OpenAPI annotation for setting generated descriptions on APIs, groups, endpoints, or security schemes.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { OpenApi } from "effect/unstable/httpapi"` and use `OpenApi.Description`.
- **Suggested snippet:** Consume `OpenApi.Description` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/OpenApi.License`

- **Source:** `packages/effect/src/unstable/httpapi/OpenApi.ts:71`
- **Kind / category:** `root-declaration` / `annotations`
- **Priority:** **optional**
- **Current description:** OpenAPI annotation for setting the generated API license metadata.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { OpenApi } from "effect/unstable/httpapi"` and use `OpenApi.License`.
- **Suggested snippet:** Consume `OpenApi.License` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/OpenApi.ExternalDocs`

- **Source:** `packages/effect/src/unstable/httpapi/OpenApi.ts:79`
- **Kind / category:** `root-declaration` / `annotations`
- **Priority:** **optional**
- **Current description:** OpenAPI annotation for adding external documentation metadata to groups or endpoints.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { OpenApi } from "effect/unstable/httpapi"` and use `OpenApi.ExternalDocs`.
- **Suggested snippet:** Use `OpenApi.ExternalDocs` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/OpenApi.Servers`

- **Source:** `packages/effect/src/unstable/httpapi/OpenApi.ts:89`
- **Kind / category:** `root-declaration` / `annotations`
- **Priority:** **optional**
- **Current description:** OpenAPI annotation for setting the generated API server list.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { OpenApi } from "effect/unstable/httpapi"` and use `OpenApi.Servers`.
- **Suggested snippet:** Use `OpenApi.Servers` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/OpenApi.Format`

- **Source:** `packages/effect/src/unstable/httpapi/OpenApi.ts:99`
- **Kind / category:** `root-declaration` / `annotations`
- **Priority:** **optional**
- **Current description:** OpenAPI annotation for setting the format metadata, such as a bearer token format on security schemes.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { OpenApi } from "effect/unstable/httpapi"` and use `OpenApi.Format`.
- **Suggested snippet:** Consume `OpenApi.Format` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/OpenApi.Summary`

- **Source:** `packages/effect/src/unstable/httpapi/OpenApi.ts:107`
- **Kind / category:** `root-declaration` / `annotations`
- **Priority:** **optional**
- **Current description:** OpenAPI annotation for setting generated summary text.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { OpenApi } from "effect/unstable/httpapi"` and use `OpenApi.Summary`.
- **Suggested snippet:** Consume `OpenApi.Summary` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/OpenApi.Deprecated`

- **Source:** `packages/effect/src/unstable/httpapi/OpenApi.ts:115`
- **Kind / category:** `root-declaration` / `annotations`
- **Priority:** **optional**
- **Current description:** OpenAPI annotation for marking a generated endpoint operation as deprecated.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { OpenApi } from "effect/unstable/httpapi"` and use `OpenApi.Deprecated`.
- **Suggested snippet:** Consume `OpenApi.Deprecated` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/OpenApi.Override`

- **Source:** `packages/effect/src/unstable/httpapi/OpenApi.ts:123`
- **Kind / category:** `root-declaration` / `annotations`
- **Priority:** **optional**
- **Current description:** OpenAPI annotation for shallowly merging additional fields into a generated OpenAPI object.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { OpenApi } from "effect/unstable/httpapi"` and use `OpenApi.Override`.
- **Suggested snippet:** Consume `OpenApi.Override` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/OpenApi.Exclude`

- **Source:** `packages/effect/src/unstable/httpapi/OpenApi.ts:137`
- **Kind / category:** `root-declaration` / `annotations`
- **Priority:** **optional**
- **Current description:** Annotation that excludes an annotated group or endpoint from the generated OpenAPI specification.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { OpenApi } from "effect/unstable/httpapi"` and use `OpenApi.Exclude`.
- **Suggested snippet:** Consume `OpenApi.Exclude` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/OpenApi.Transform`

- **Source:** `packages/effect/src/unstable/httpapi/OpenApi.ts:152`
- **Kind / category:** `root-declaration` / `annotations`
- **Priority:** **optional**
- **Current description:** OpenAPI annotation for transforming a generated OpenAPI object.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { OpenApi } from "effect/unstable/httpapi"` and use `OpenApi.Transform`.
- **Suggested snippet:** Consume `OpenApi.Transform` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/OpenApi.annotations`

- **Source:** `packages/effect/src/unstable/httpapi/OpenApi.ts:182`
- **Kind / category:** `root-declaration` / `annotations`
- **Priority:** **optional**
- **Current description:** Builds a `Context` containing OpenAPI annotations from the supplied options.
- **Signature hint:** `declare function annotations(options: { readonly identifier?: string | undefined; readonly title?: string | undefined; readonly version?: string | undefined; readonly description?: string | undefined; readonly license?: OpenAPISpecLicense | undefined; readonly summary?: string | undefined; readonly deprecated?: boolean | undefined; readonly externalDocs?: OpenAPISpecExternalDocs | undefined; readonly servers?: ReadonlyArray<OpenAPISpecServer> | undefined; readonly format?: string | undefined; readonly override?: Record<string, unknown> | undefined; readonly exclude?: boolean | undefined; readonly transform?: ((openApiSpec: Record<string, any>) => Record<string, any>) | undefined; }): Context.Context<never>`
- **Import guidance:** Start from `import { OpenApi } from "effect/unstable/httpapi"` and use `OpenApi.annotations`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Builds a `Context` containing OpenAPI annotations from the supplied options. Call `OpenApi.annotations` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/OpenApi.fromApi`

- **Source:** `packages/effect/src/unstable/httpapi/OpenApi.ts:263`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Converts an `HttpApi` instance into an OpenAPI Specification object.
- **Signature hint:** `declare function fromApi<Id extends string, Groups extends HttpApiGroup.Constraint>(api: HttpApi.HttpApi<Id, Groups>): OpenAPISpec`
- **Import guidance:** Start from `import { OpenApi } from "effect/unstable/httpapi"` and use `OpenApi.fromApi`.
- **Suggested snippet:** Convert one representative external input with `OpenApi.fromApi` and assert the semantic output. Add one invalid or boundary input only when the return type models failure or absence.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/OpenApi.OpenAPISpec`

- **Source:** `packages/effect/src/unstable/httpapi/OpenApi.ts:887`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** This model describes the OpenAPI specification (version 3.1.0) returned by `fromApi`. It is not intended to describe the entire OpenAPI specification, only the output of `fromApi`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/httpapi/OpenApi.OpenAPISpec`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/OpenApi.OpenAPISpecInfo`

- **Source:** `packages/effect/src/unstable/httpapi/OpenApi.ts:903`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** OpenAPI `info` object generated by `fromApi`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/httpapi/OpenApi.OpenAPISpecInfo`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/OpenApi.OpenAPISpecTag`

- **Source:** `packages/effect/src/unstable/httpapi/OpenApi.ts:917`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** OpenAPI tag object generated for an HTTP API group.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/httpapi/OpenApi.OpenAPISpecTag`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/OpenApi.OpenAPISpecExternalDocs`

- **Source:** `packages/effect/src/unstable/httpapi/OpenApi.ts:929`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** OpenAPI external documentation metadata.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/httpapi/OpenApi.OpenAPISpecExternalDocs`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/OpenApi.OpenAPISpecLicense`

- **Source:** `packages/effect/src/unstable/httpapi/OpenApi.ts:940`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** OpenAPI license metadata used in the generated `info` object.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/httpapi/OpenApi.OpenAPISpecLicense`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/OpenApi.OpenAPISpecServer`

- **Source:** `packages/effect/src/unstable/httpapi/OpenApi.ts:952`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** OpenAPI server object used in the generated `servers` array.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/httpapi/OpenApi.OpenAPISpecServer`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/OpenApi.OpenAPISpecServerVariable`

- **Source:** `packages/effect/src/unstable/httpapi/OpenApi.ts:964`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** OpenAPI variable definition for templated server URLs.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/httpapi/OpenApi.OpenAPISpecServerVariable`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/OpenApi.OpenAPISpecPaths`

- **Source:** `packages/effect/src/unstable/httpapi/OpenApi.ts:976`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Generated OpenAPI `paths` object, keyed by route path.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/httpapi/OpenApi.OpenAPISpecPaths`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/OpenApi.OpenAPISpecMethodName`

- **Source:** `packages/effect/src/unstable/httpapi/OpenApi.ts:984`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Lowercase HTTP method names used as keys in generated OpenAPI path items.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/httpapi/OpenApi.OpenAPISpecMethodName`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/OpenApi.OpenAPISpecPathItem`

- **Source:** `packages/effect/src/unstable/httpapi/OpenApi.ts:1000`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Generated OpenAPI path item mapping HTTP methods to operations for a single route path.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/httpapi/OpenApi.OpenAPISpecPathItem`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/OpenApi.OpenAPISpecParameter`

- **Source:** `packages/effect/src/unstable/httpapi/OpenApi.ts:1010`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Generated OpenAPI parameter object for path, query, header, or cookie parameters.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/httpapi/OpenApi.OpenAPISpecParameter`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/OpenApi.OpenAPISpecResponses`

- **Source:** `packages/effect/src/unstable/httpapi/OpenApi.ts:1024`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Generated OpenAPI responses object, keyed by HTTP status code.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/httpapi/OpenApi.OpenAPISpecResponses`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/OpenApi.OpenApiSpecContent`

- **Source:** `packages/effect/src/unstable/httpapi/OpenApi.ts:1032`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Generated OpenAPI content object, keyed by media type.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/httpapi/OpenApi.OpenApiSpecContent`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/OpenApi.OpenApiSpecResponse`

- **Source:** `packages/effect/src/unstable/httpapi/OpenApi.ts:1042`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Generated OpenAPI response object for an endpoint success or error schema.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/httpapi/OpenApi.OpenApiSpecResponse`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/OpenApi.OpenApiSpecMediaType`

- **Source:** `packages/effect/src/unstable/httpapi/OpenApi.ts:1053`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Generated OpenAPI media type object containing the JSON Schema for a request or response body.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/httpapi/OpenApi.OpenApiSpecMediaType`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/OpenApi.OpenApiSpecEffectStream`

- **Source:** `packages/effect/src/unstable/httpapi/OpenApi.ts:1064`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Effect-specific metadata for generated streaming response media types.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/httpapi/OpenApi.OpenApiSpecEffectStream`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/OpenApi.OpenAPISpecRequestBody`

- **Source:** `packages/effect/src/unstable/httpapi/OpenApi.ts:1081`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Generated OpenAPI request body object for endpoint payloads.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/httpapi/OpenApi.OpenAPISpecRequestBody`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/OpenApi.OpenAPIComponents`

- **Source:** `packages/effect/src/unstable/httpapi/OpenApi.ts:1092`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Generated OpenAPI components containing shared schemas and security schemes.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/httpapi/OpenApi.OpenAPIComponents`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/OpenApi.OpenAPIHTTPSecurityScheme`

- **Source:** `packages/effect/src/unstable/httpapi/OpenApi.ts:1103`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Generated OpenAPI HTTP security scheme, such as bearer or basic authentication.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/httpapi/OpenApi.OpenAPIHTTPSecurityScheme`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/OpenApi.OpenAPIApiKeySecurityScheme`

- **Source:** `packages/effect/src/unstable/httpapi/OpenApi.ts:1117`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Generated OpenAPI API key security scheme.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/httpapi/OpenApi.OpenAPIApiKeySecurityScheme`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/OpenApi.OpenAPISecurityScheme`

- **Source:** `packages/effect/src/unstable/httpapi/OpenApi.ts:1130`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Union of security scheme objects emitted in generated OpenAPI components.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/httpapi/OpenApi.OpenAPISecurityScheme`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/OpenApi.OpenAPISecurityRequirement`

- **Source:** `packages/effect/src/unstable/httpapi/OpenApi.ts:1140`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Generated OpenAPI security requirement, keyed by security scheme name.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/httpapi/OpenApi.OpenAPISecurityRequirement`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/OpenApi.OpenAPISpecOperation`

- **Source:** `packages/effect/src/unstable/httpapi/OpenApi.ts:1148`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Generated OpenAPI operation object for an HTTP API endpoint.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/httpapi/OpenApi.OpenAPISpecOperation`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/OpenApi.OpenAPISpecOperation.tags`

- **Source:** `packages/effect/src/unstable/httpapi/OpenApi.ts:1153`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Always contains at least the title annotation or the group identifier
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/httpapi/OpenApi.OpenAPISpecOperation.tags` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.
