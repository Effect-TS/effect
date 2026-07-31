# Example Suggestions: `effect/unstable/httpapi/HttpApiBuilder`

- **Package:** `effect`
- **Source:** `packages/effect/src/unstable/httpapi/HttpApiBuilder.ts`
- **Uncovered API records:** 14
- **Priorities:** 0 required, 5 recommended, 9 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                              | Line | Kind                    | Priority        |
| ---------------------------------------------------------------- | ---: | ----------------------- | --------------- |
| `effect/unstable/httpapi/HttpApiBuilder.layer`                   |   64 | `root-declaration`      | **recommended** |
| `effect/unstable/httpapi/HttpApiBuilder.group`                   |  121 | `root-declaration`      | **recommended** |
| `effect/unstable/httpapi/HttpApiBuilder.endpoint`                |  436 | `root-declaration`      | **recommended** |
| `effect/unstable/httpapi/HttpApiBuilder.securityDecode`          |  476 | `root-declaration`      | **recommended** |
| `effect/unstable/httpapi/HttpApiBuilder.securitySetCookie`       |  542 | `root-declaration`      | **recommended** |
| `effect/unstable/httpapi/HttpApiBuilder.Handlers (type)`         |  261 | `root-declaration`      | **optional**    |
| `effect/unstable/httpapi/HttpApiBuilder.Handlers.handle`         |  277 | `member`                | **optional**    |
| `effect/unstable/httpapi/HttpApiBuilder.Handlers.handleAll`      |  297 | `member`                | **optional**    |
| `effect/unstable/httpapi/HttpApiBuilder.Handlers.handleRaw`      |  311 | `member`                | **optional**    |
| `effect/unstable/httpapi/HttpApiBuilder.Handlers (type)`         |  334 | `namespace`             | **optional**    |
| `effect/unstable/httpapi/HttpApiBuilder.Handlers.FromGroup`      |  342 | `namespace-declaration` | **optional**    |
| `effect/unstable/httpapi/HttpApiBuilder.Handlers.ValidateReturn` |  355 | `namespace-declaration` | **optional**    |
| `effect/unstable/httpapi/HttpApiBuilder.Handlers.Error`          |  364 | `namespace-declaration` | **optional**    |
| `effect/unstable/httpapi/HttpApiBuilder.Handlers.Context`        |  382 | `namespace-declaration` | **optional**    |

## Recommended

### `effect/unstable/httpapi/HttpApiBuilder.layer`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiBuilder.ts:64`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Registers an `HttpApi` with a `HttpRouter`.
- **Signature hint:** `declare function layer<Id extends string, Groups extends HttpApiGroup.Constraint>(api: HttpApi.HttpApi<Id, Groups>, options?: { readonly openapiPath?: '/${string}' | undefined; }): Layer.Layer<never, never, Etag.Generator | HttpRouter.HttpRouter | FileSystem | HttpPlatform | Path | HttpApiGroup.ToService<Id, Groups>>`
- **Import guidance:** Start from `import { HttpApiBuilder } from "effect/unstable/httpapi"` and use `HttpApiBuilder.layer`.
- **Suggested snippet:** Use the public setup or registry consumed by `HttpApiBuilder.layer`, apply the layer, and assert the registration, migration, route, resource, or other side effect documented by nearby tests. The layer provides no service, so do not write an example that yields a service from context.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/httpapi/HttpApiBuilder.group`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiBuilder.ts:121`
- **Kind / category:** `root-declaration` / `handlers`
- **Priority:** **recommended**
- **Current description:** Create a `Layer` that implements all endpoints in an `HttpApi` group.
- **Signature hint:** `declare function group<ApiId extends string, Groups extends HttpApiGroup.Constraint, const Identifier extends HttpApiGroup.Identifier<Groups>, Return>(api: HttpApi.HttpApi<ApiId, Groups>, groupIdentifier: Identifier, build: (handlers: Handlers.FromGroup<HttpApiGroup.WithIdentifier<Groups, Identifier>>) => Handlers.ValidateReturn<Return>): Layer.Layer<HttpApiGroup.Service<ApiId, Identifier>, Handlers.Error<Return>, Exclude<Handlers.Context<Return>, Scope.Scope>>`
- **Import guidance:** Start from `import { HttpApiBuilder } from "effect/unstable/httpapi"` and use `HttpApiBuilder.group`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `HttpApiBuilder.group`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/httpapi/HttpApiBuilder.endpoint`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiBuilder.ts:436`
- **Kind / category:** `root-declaration` / `handlers`
- **Priority:** **recommended**
- **Current description:** Builds the server-side HTTP effect for a single endpoint in an API group using the endpoint metadata, middleware, codecs, and supplied handler.
- **Signature hint:** `declare function endpoint<ApiId extends string, Groups extends HttpApiGroup.Constraint, const GroupIdentifier extends HttpApiGroup.Identifier<Groups>, const EndpointIdentifier extends HttpApiGroup.Endpoints<HttpApiGroup.WithIdentifier<Groups, GroupIdentifier>>['identifier'], R>(api: HttpApi.HttpApi<ApiId, Groups>, groupIdentifier: GroupIdentifier, endpointIdentifier: EndpointIdentifier, handler: NoInfer<HttpApiEndpoint.HandlerWithIdentifier<HttpApiGroup.Endpoints<HttpApiGroup.WithIdentifier<Groups, GroupIdentifier>>, EndpointIdentifier, never, R>>): EndpointReturn<Groups, GroupIdentifier, EndpointIdentifier, R>`
- **Import guidance:** Start from `import { HttpApiBuilder } from "effect/unstable/httpapi"` and use `HttpApiBuilder.endpoint`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Builds the server-side HTTP effect for a single endpoint in an API group using the endpoint metadata, middleware, codecs, and supplied handler. Call `HttpApiBuilder.endpoint` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/httpapi/HttpApiBuilder.securityDecode`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiBuilder.ts:476`
- **Kind / category:** `root-declaration` / `security`
- **Priority:** **recommended**
- **Current description:** Decodes credentials for an HTTP API security scheme from the current request, supporting bearer, API key, and basic authentication inputs.
- **Signature hint:** `declare function securityDecode<Security extends HttpApiSecurity.HttpApiSecurity>(self: Security): Effect.Effect<HttpApiSecurity.HttpApiSecurity.Type<Security>, never, HttpServerRequest | Request.ParsedSearchParams>`
- **Import guidance:** Start from `import { HttpApiBuilder } from "effect/unstable/httpapi"` and use `HttpApiBuilder.securityDecode`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `HttpApiBuilder.securityDecode`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/httpapi/HttpApiBuilder.securitySetCookie`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiBuilder.ts:542`
- **Kind / category:** `root-declaration` / `security`
- **Priority:** **recommended**
- **Current description:** Registers a pre-response handler that sets an API-key cookie on the outgoing response, defaulting the cookie to `secure` and `httpOnly` unless overridden.
- **Signature hint:** `declare function securitySetCookie(self: HttpApiSecurity.ApiKey, value: string | Redacted.Redacted, options?: Cookie['options']): Effect.Effect<void, never, HttpServerRequest>`
- **Import guidance:** Start from `import { HttpApiBuilder } from "effect/unstable/httpapi"` and use `HttpApiBuilder.securitySetCookie`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `HttpApiBuilder.securitySetCookie`, execute it explicitly, and assert its semantic success value or captured failure.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `effect/unstable/httpapi/HttpApiBuilder.Handlers (type)`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiBuilder.ts:261`
- **Kind / category:** `root-declaration` / `handlers`
- **Priority:** **optional**
- **Current description:** Mutable handler collection for one `HttpApi` group.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/httpapi/HttpApiBuilder.Handlers`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/HttpApiBuilder.Handlers.handle`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiBuilder.ts:277`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Add the implementation for an unhandled `HttpApiEndpoint` to a `Handlers` group.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/httpapi/HttpApiBuilder.Handlers.handle` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/HttpApiBuilder.Handlers.handleAll`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiBuilder.ts:297`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Add implementations for unhandled `HttpApiEndpoint`s in a `Handlers` group.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/httpapi/HttpApiBuilder.Handlers.handleAll` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/HttpApiBuilder.Handlers.handleRaw`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiBuilder.ts:311`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Add the implementation for an unhandled `HttpApiEndpoint` to a `Handlers` group. This version opts out of automatic payload decoding and provides the raw request.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/httpapi/HttpApiBuilder.Handlers.handleRaw` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/HttpApiBuilder.Handlers (type)`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiBuilder.ts:334`
- **Kind / category:** `namespace` / `none`
- **Priority:** **optional**
- **Current description:** Namespace containing helper types for `HttpApiBuilder` handler collections.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/httpapi/HttpApiBuilder.Handlers`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/HttpApiBuilder.Handlers.FromGroup`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiBuilder.ts:342`
- **Kind / category:** `namespace-declaration` / `handlers`
- **Priority:** **optional**
- **Current description:** Creates a handler collection for a group where every endpoint in the group is still awaiting an implementation.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/httpapi/HttpApiBuilder.Handlers.FromGroup`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/HttpApiBuilder.Handlers.ValidateReturn`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiBuilder.ts:355`
- **Kind / category:** `namespace-declaration` / `handlers`
- **Priority:** **optional**
- **Current description:** Validates the return value of a group handler builder, preserving successful handler collections and producing a descriptive type error when endpoints remain unhandled.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/httpapi/HttpApiBuilder.Handlers.ValidateReturn`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/HttpApiBuilder.Handlers.Error`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiBuilder.ts:364`
- **Kind / category:** `namespace-declaration` / `handlers`
- **Priority:** **optional**
- **Current description:** Extracts the error channel from an effect that produces a `Handlers` collection, returning `never` for non-effectful handler collections.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/httpapi/HttpApiBuilder.Handlers.Error`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/HttpApiBuilder.Handlers.Context`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiBuilder.ts:382`
- **Kind / category:** `namespace-declaration` / `handlers`
- **Priority:** **optional**
- **Current description:** Extracts the services required by a handler collection, including both handler requirements and the environment required to construct the handlers.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/httpapi/HttpApiBuilder.Handlers.Context`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.
