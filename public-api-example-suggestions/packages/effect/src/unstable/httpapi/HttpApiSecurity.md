# Example Suggestions: `effect/unstable/httpapi/HttpApiSecurity`

- **Package:** `effect`
- **Source:** `packages/effect/src/unstable/httpapi/HttpApiSecurity.ts`
- **Uncovered API records:** 14
- **Priorities:** 0 required, 1 recommended, 13 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                                     | Line | Kind                    | Priority        |
| ----------------------------------------------------------------------- | ---: | ----------------------- | --------------- |
| `effect/unstable/httpapi/HttpApiSecurity.annotate`                      |  234 | `root-declaration`      | **recommended** |
| `effect/unstable/httpapi/HttpApiSecurity.http`                          |  126 | `root-declaration`      | **optional**    |
| `effect/unstable/httpapi/HttpApiSecurity.bearer`                        |  154 | `root-declaration`      | **optional**    |
| `effect/unstable/httpapi/HttpApiSecurity.apiKey`                        |  177 | `root-declaration`      | **optional**    |
| `effect/unstable/httpapi/HttpApiSecurity.basic`                         |  205 | `root-declaration`      | **optional**    |
| `effect/unstable/httpapi/HttpApiSecurity.annotateMerge`                 |  216 | `root-declaration`      | **optional**    |
| `effect/unstable/httpapi/HttpApiSecurity.HttpApiSecurity (type) (type)` |   25 | `root-declaration`      | **optional**    |
| `effect/unstable/httpapi/HttpApiSecurity.HttpApiSecurity (type) (type)` |   32 | `namespace`             | **optional**    |
| `effect/unstable/httpapi/HttpApiSecurity.HttpApiSecurity.Proto`         |   39 | `namespace-declaration` | **optional**    |
| `effect/unstable/httpapi/HttpApiSecurity.HttpApiSecurity.Type`          |   52 | `namespace-declaration` | **optional**    |
| `effect/unstable/httpapi/HttpApiSecurity.Http`                          |   61 | `root-declaration`      | **optional**    |
| `effect/unstable/httpapi/HttpApiSecurity.ApiKey`                        |   74 | `root-declaration`      | **optional**    |
| `effect/unstable/httpapi/HttpApiSecurity.Basic`                         |   86 | `root-declaration`      | **optional**    |
| `effect/unstable/httpapi/HttpApiSecurity.Credentials`                   |   96 | `root-declaration`      | **optional**    |

## Recommended

### `effect/unstable/httpapi/HttpApiSecurity.annotate`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiSecurity.ts:234`
- **Kind / category:** `root-declaration` / `annotations`
- **Priority:** **recommended**
- **Current description:** Adds an OpenAPI annotation value to a security scheme.
- **Signature hint:** `declare function annotate<I, S>(service: Context.Key<I, S>, value: S): <A extends HttpApiSecurity>(self: A) => A declare function annotate<A extends HttpApiSecurity, I, S>(self: A, service: Context.Key<I, S>, value: S): A`
- **Import guidance:** Start from `import { HttpApiSecurity } from "effect/unstable/httpapi"` and use `HttpApiSecurity.annotate`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Adds an OpenAPI annotation value to a security scheme. Call `HttpApiSecurity.annotate` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `effect/unstable/httpapi/HttpApiSecurity.http`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiSecurity.ts:126`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Creates a Http token security scheme.
- **Signature hint:** `declare function http(options: { readonly scheme: string; }): Http`
- **Import guidance:** Start from `import { HttpApiSecurity } from "effect/unstable/httpapi"` and use `HttpApiSecurity.http`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Creates a Http token security scheme. Call `HttpApiSecurity.http` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/HttpApiSecurity.bearer`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiSecurity.ts:154`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Creates a Bearer token security scheme.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { HttpApiSecurity } from "effect/unstable/httpapi"` and use `HttpApiSecurity.bearer`.
- **Suggested snippet:** Use `HttpApiSecurity.bearer` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/HttpApiSecurity.apiKey`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiSecurity.ts:177`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Creates an API key security scheme.
- **Signature hint:** `declare function apiKey(options: { readonly key: string; readonly in?: 'header' | 'query' | 'cookie' | undefined; }): ApiKey`
- **Import guidance:** Start from `import { HttpApiSecurity } from "effect/unstable/httpapi"` and use `HttpApiSecurity.apiKey`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Creates an API key security scheme. Call `HttpApiSecurity.apiKey` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/HttpApiSecurity.basic`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiSecurity.ts:205`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Creates an HTTP Basic authentication security scheme.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { HttpApiSecurity } from "effect/unstable/httpapi"` and use `HttpApiSecurity.basic`.
- **Suggested snippet:** Use `HttpApiSecurity.basic` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/HttpApiSecurity.annotateMerge`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiSecurity.ts:216`
- **Kind / category:** `root-declaration` / `annotations`
- **Priority:** **optional**
- **Current description:** Merges OpenAPI annotations into a security scheme.
- **Signature hint:** `declare function annotateMerge<I>(annotations: Context.Context<I>): <A extends HttpApiSecurity>(self: A) => A declare function annotateMerge<A extends HttpApiSecurity, I>(self: A, annotations: Context.Context<I>): A`
- **Import guidance:** Start from `import { HttpApiSecurity } from "effect/unstable/httpapi"` and use `HttpApiSecurity.annotateMerge`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Merges OpenAPI annotations into a security scheme. Call `HttpApiSecurity.annotateMerge` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/HttpApiSecurity.HttpApiSecurity (type) (type)`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiSecurity.ts:25`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Union of security schemes supported by the HTTP API OpenAPI model.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/httpapi/HttpApiSecurity.HttpApiSecurity (type)`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/HttpApiSecurity.HttpApiSecurity (type) (type)`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiSecurity.ts:32`
- **Kind / category:** `namespace` / `none`
- **Priority:** **optional**
- **Current description:** Helper types for HTTP API security schemes.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/httpapi/HttpApiSecurity.HttpApiSecurity (type)`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/HttpApiSecurity.HttpApiSecurity.Proto`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiSecurity.ts:39`
- **Kind / category:** `namespace-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Common prototype for security schemes, carrying the credential type and OpenAPI annotations.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/httpapi/HttpApiSecurity.HttpApiSecurity.Proto`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/HttpApiSecurity.HttpApiSecurity.Type`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiSecurity.ts:52`
- **Kind / category:** `namespace-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Extracts the credential type produced by a security scheme.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/httpapi/HttpApiSecurity.HttpApiSecurity.Type`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/HttpApiSecurity.Http`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiSecurity.ts:61`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Http token security scheme whose decoded credential is a redacted token.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/httpapi/HttpApiSecurity.Http`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/HttpApiSecurity.ApiKey`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiSecurity.ts:74`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** API key security scheme identifying the key name and whether it is read from a header, query parameter, or cookie.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/httpapi/HttpApiSecurity.ApiKey`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/HttpApiSecurity.Basic`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiSecurity.ts:86`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** HTTP Basic authentication security scheme whose decoded credential is `Credentials`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/httpapi/HttpApiSecurity.Basic`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/HttpApiSecurity.Credentials`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiSecurity.ts:96`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Decoded credentials for HTTP Basic authentication.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/httpapi/HttpApiSecurity.Credentials`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.
