# Example Suggestions: `effect/unstable/httpapi/HttpApiClient`

- **Package:** `effect`
- **Source:** `packages/effect/src/unstable/httpapi/HttpApiClient.ts`
- **Uncovered API records:** 13
- **Priorities:** 0 required, 4 recommended, 9 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                            | Line | Kind                    | Priority        |
| -------------------------------------------------------------- | ---: | ----------------------- | --------------- |
| `effect/unstable/httpapi/HttpApiClient.make`                   |  476 | `root-declaration`      | **recommended** |
| `effect/unstable/httpapi/HttpApiClient.makeWith`               |  504 | `root-declaration`      | **recommended** |
| `effect/unstable/httpapi/HttpApiClient.group`                  |  542 | `root-declaration`      | **recommended** |
| `effect/unstable/httpapi/HttpApiClient.endpoint`               |  592 | `root-declaration`      | **recommended** |
| `effect/unstable/httpapi/HttpApiClient.Client (type) (type)`   |   50 | `root-declaration`      | **optional**    |
| `effect/unstable/httpapi/HttpApiClient.ForApi`                 |   68 | `root-declaration`      | **optional**    |
| `effect/unstable/httpapi/HttpApiClient.Client (type) (type)`   |  102 | `namespace`             | **optional**    |
| `effect/unstable/httpapi/HttpApiClient.Client.ResponseMode`    |  110 | `namespace-declaration` | **optional**    |
| `effect/unstable/httpapi/HttpApiClient.Client.Response`        |  119 | `namespace-declaration` | **optional**    |
| `effect/unstable/httpapi/HttpApiClient.Client.Group`           |  137 | `namespace-declaration` | **optional**    |
| `effect/unstable/httpapi/HttpApiClient.Client.Method`          |  170 | `namespace-declaration` | **optional**    |
| `effect/unstable/httpapi/HttpApiClient.Client.TopLevelMethods` |  193 | `namespace-declaration` | **optional**    |
| `effect/unstable/httpapi/HttpApiClient.UrlBuilder`             |  226 | `root-declaration`      | **optional**    |

## Recommended

### `effect/unstable/httpapi/HttpApiClient.make`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiClient.ts:476`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Constructs a type-safe client for an HTTP API using the `HttpClient` service, endpoint schemas, middleware, and optional client or response transformations.
- **Signature hint:** `declare function make<ApiId extends string, Groups extends HttpApiGroup.Constraint>(api: HttpApi.HttpApi<ApiId, Groups>, options?: { readonly transformClient?: ((client: HttpClient.HttpClient) => HttpClient.HttpClient) | undefined; readonly transformResponse?: ((effect: Effect.Effect<unknown, unknown, unknown>) => Effect.Effect<unknown, unknown, unknown>) | undefined; readonly baseUrl?: URL | string | undefined; }): Effect.Effect<Client<Groups>, never, HttpClient.HttpClient | HttpApiGroup.MiddlewareClient<Groups>>`
- **Import guidance:** Start from `import { HttpApiClient } from "effect/unstable/httpapi"` and use `HttpApiClient.make`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `HttpApiClient.make`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/httpapi/HttpApiClient.makeWith`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiClient.ts:504`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Constructs a type-safe client for an HTTP API from the supplied `HttpClient`, using the API metadata to encode requests, execute middleware, and decode responses.
- **Signature hint:** `declare function makeWith<ApiId extends string, Groups extends HttpApiGroup.Constraint, E, R>(api: HttpApi.HttpApi<ApiId, Groups>, options: { readonly httpClient: HttpClient.HttpClient.With<E, R>; readonly transformResponse?: ((effect: Effect.Effect<unknown, unknown, unknown>) => Effect.Effect<unknown, unknown, unknown>) | undefined; readonly baseUrl?: URL | string | undefined; }): Effect.Effect<Client<Groups, Exclude<E, HttpClientError.HttpClientError>, R>, never, HttpApiGroup.MiddlewareClient<Groups>>`
- **Import guidance:** Start from `import { HttpApiClient } from "effect/unstable/httpapi"` and use `HttpApiClient.makeWith`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `HttpApiClient.makeWith`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/httpapi/HttpApiClient.group`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiClient.ts:542`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Builds a typed client object for a single API group from the supplied `HttpClient`, filtering the API to that group.
- **Signature hint:** `declare function group<ApiId extends string, Groups extends HttpApiGroup.Constraint, const GroupIdentifier extends HttpApiGroup.Identifier<Groups>, E, R>(api: HttpApi.HttpApi<ApiId, Groups>, options: { readonly group: GroupIdentifier; readonly httpClient: HttpClient.HttpClient.With<E, R>; readonly transformResponse?: ((effect: Effect.Effect<unknown, unknown, unknown>) => Effect.Effect<unknown, unknown, unknown>) | undefined; readonly baseUrl?: URL | string | undefined; }): Effect.Effect<Client.Group<HttpApiGroup.WithIdentifier<Groups, GroupIdentifier>, E, R>, never, HttpApiGroup.MiddlewareClient<HttpApiGroup.WithIdentifier<Groups, GroupIdentifier>>>`
- **Import guidance:** Start from `import { HttpApiClient } from "effect/unstable/httpapi"` and use `HttpApiClient.group`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `HttpApiClient.group`, execute it explicitly, and assert its semantic success value or captured failure.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/httpapi/HttpApiClient.endpoint`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiClient.ts:592`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Builds the typed client method for one endpoint in one API group, using the supplied `HttpClient` and endpoint metadata.
- **Signature hint:** `declare function endpoint<ApiId extends string, Groups extends HttpApiGroup.Constraint, const GroupIdentifier extends HttpApiGroup.Identifier<Groups>, const EndpointIdentifier extends HttpApiGroup.EndpointsWithIdentifier<Groups, GroupIdentifier>['identifier'], E, R>(api: HttpApi.HttpApi<ApiId, Groups>, options: { readonly group: GroupIdentifier; readonly endpoint: EndpointIdentifier; readonly httpClient: HttpClient.HttpClient.With<E, R>; readonly transformClient?: ((client: HttpClient.HttpClient.With<E, R>) => HttpClient.HttpClient.With<E, R>) | undefined; readonly transformResponse?: ((effect: Effect.Effect<unknown, unknown, unknown>) => Effect.Effect<unknown, unknown, unknown>) | undefined; readonly baseUrl?: URL | string | undefined; }): EndpointReturn<Groups, GroupIdentifier, EndpointIdentifier, E, R>`
- **Import guidance:** Start from `import { HttpApiClient } from "effect/unstable/httpapi"` and use `HttpApiClient.endpoint`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Builds the typed client method for one endpoint in one API group, using the supplied `HttpClient` and endpoint metadata. Call `HttpApiClient.endpoint` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `effect/unstable/httpapi/HttpApiClient.Client (type) (type)`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiClient.ts:50`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** The type-safe client shape generated from HTTP API groups, with non-top-level groups exposed as nested objects and top-level endpoints exposed as methods.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/httpapi/HttpApiClient.Client (type)`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/HttpApiClient.ForApi`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiClient.ts:68`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Derives the typed client interface for an `HttpApi`, preserving any additional client error and service requirements supplied by the caller.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/httpapi/HttpApiClient.ForApi`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/HttpApiClient.Client (type) (type)`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiClient.ts:102`
- **Kind / category:** `namespace` / `none`
- **Priority:** **optional**
- **Current description:** Helper types used to describe generated HTTP API clients, including endpoint methods, response modes, and grouped client shapes.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/httpapi/HttpApiClient.Client (type)`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/HttpApiClient.Client.ResponseMode`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiClient.ts:110`
- **Kind / category:** `namespace-declaration` / `models`
- **Priority:** **optional**
- **Current description:** The response mode accepted by generated client methods, controlling whether a call returns the decoded success value, the raw response, or both.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/httpapi/HttpApiClient.Client.ResponseMode`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/HttpApiClient.Client.Response`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiClient.ts:119`
- **Kind / category:** `namespace-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Computes the value returned by a client method for a success type and response mode.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/httpapi/HttpApiClient.Client.Response`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/HttpApiClient.Client.Group`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiClient.ts:137`
- **Kind / category:** `namespace-declaration` / `models`
- **Priority:** **optional**
- **Current description:** The client object for one API group, mapping each endpoint identifier in that group to its typed client method.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/httpapi/HttpApiClient.Client.Group`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/HttpApiClient.Client.Method`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiClient.ts:170`
- **Kind / category:** `namespace-declaration` / `models`
- **Priority:** **optional**
- **Current description:** The typed function generated for an endpoint, accepting the endpoint request shape and returning an effect whose success, error, and service channels reflect the endpoint schemas, middleware, and selected response mode.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/httpapi/HttpApiClient.Client.Method`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/HttpApiClient.Client.TopLevelMethods`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiClient.ts:193`
- **Kind / category:** `namespace-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Extracts client methods for endpoints in top-level groups so they can be exposed directly on the generated client object.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/httpapi/HttpApiClient.Client.TopLevelMethods`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/HttpApiClient.UrlBuilder`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiClient.ts:226`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** The type-safe URL builder shape for an HTTP API, mirroring the generated client layout while returning URL strings instead of executing requests.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/httpapi/HttpApiClient.UrlBuilder`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.
