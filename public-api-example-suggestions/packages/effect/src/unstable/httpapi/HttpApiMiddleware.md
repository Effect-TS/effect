# Example Suggestions: `effect/unstable/httpapi/HttpApiMiddleware`

- **Package:** `effect`
- **Source:** `packages/effect/src/unstable/httpapi/HttpApiMiddleware.ts`
- **Uncovered API records:** 20
- **Priorities:** 0 required, 3 recommended, 17 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                                   | Line | Kind               | Priority        |
| --------------------------------------------------------------------- | ---: | ------------------ | --------------- |
| `effect/unstable/httpapi/HttpApiMiddleware.layerClient`               |  504 | `root-declaration` | **recommended** |
| `effect/unstable/httpapi/HttpApiMiddleware.isSecurity`                |   44 | `root-declaration` | **recommended** |
| `effect/unstable/httpapi/HttpApiMiddleware.Service`                   |  320 | `root-declaration` | **recommended** |
| `effect/unstable/httpapi/HttpApiMiddleware.ServiceClass`              |  272 | `root-declaration` | **optional**    |
| `effect/unstable/httpapi/HttpApiMiddleware.HttpApiMiddleware`         |   64 | `root-declaration` | **optional**    |
| `effect/unstable/httpapi/HttpApiMiddleware.HttpApiMiddlewareSecurity` |   83 | `root-declaration` | **optional**    |
| `effect/unstable/httpapi/HttpApiMiddleware.HttpApiMiddlewareClient`   |  114 | `root-declaration` | **optional**    |
| `effect/unstable/httpapi/HttpApiMiddleware.ForClient`                 |  131 | `root-declaration` | **optional**    |
| `effect/unstable/httpapi/HttpApiMiddleware.AnyService`                |  142 | `root-declaration` | **optional**    |
| `effect/unstable/httpapi/HttpApiMiddleware.AnyServiceSecurity`        |  156 | `root-declaration` | **optional**    |
| `effect/unstable/httpapi/HttpApiMiddleware.AnyId`                     |  167 | `root-declaration` | **optional**    |
| `effect/unstable/httpapi/HttpApiMiddleware.Provides`                  |  183 | `root-declaration` | **optional**    |
| `effect/unstable/httpapi/HttpApiMiddleware.Requires`                  |  191 | `root-declaration` | **optional**    |
| `effect/unstable/httpapi/HttpApiMiddleware.ApplyServices`             |  199 | `root-declaration` | **optional**    |
| `effect/unstable/httpapi/HttpApiMiddleware.ErrorSchema`               |  207 | `root-declaration` | **optional**    |
| `effect/unstable/httpapi/HttpApiMiddleware.Error`                     |  216 | `root-declaration` | **optional**    |
| `effect/unstable/httpapi/HttpApiMiddleware.ClientError`               |  224 | `root-declaration` | **optional**    |
| `effect/unstable/httpapi/HttpApiMiddleware.MiddlewareClient`          |  238 | `root-declaration` | **optional**    |
| `effect/unstable/httpapi/HttpApiMiddleware.ErrorServicesEncode`       |  251 | `root-declaration` | **optional**    |
| `effect/unstable/httpapi/HttpApiMiddleware.ErrorServicesDecode`       |  259 | `root-declaration` | **optional**    |

## Recommended

### `effect/unstable/httpapi/HttpApiMiddleware.layerClient`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiMiddleware.ts:504`
- **Kind / category:** `root-declaration` / `client`
- **Priority:** **recommended**
- **Current description:** Provides a client-side middleware implementation for a middleware that is required by generated clients.
- **Signature hint:** `declare function layerClient<Id extends AnyId, S, R, EX = never, RX = never>(tag: Context.Key<Id, S>, service: HttpApiMiddlewareClient<Error<Id>, Id[typeof TypeId]['clientError'], R> | Effect.Effect<HttpApiMiddlewareClient<Error<Id>, Id[typeof TypeId]['clientError'], R>, EX, RX>): Layer.Layer<ForClient<Id>, EX, R | Exclude<RX, Scope>>`
- **Import guidance:** Start from `import { HttpApiMiddleware } from "effect/unstable/httpapi"` and use `HttpApiMiddleware.layerClient`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `HttpApiMiddleware.layerClient`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/httpapi/HttpApiMiddleware.isSecurity`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiMiddleware.ts:44`
- **Kind / category:** `root-declaration` / `guards`
- **Priority:** **recommended**
- **Current description:** Returns `true` when an HTTP API middleware service is security middleware.
- **Signature hint:** `declare function isSecurity(u: AnyService): u is AnyServiceSecurity`
- **Import guidance:** Start from `import { HttpApiMiddleware } from "effect/unstable/httpapi"` and use `HttpApiMiddleware.isSecurity`.
- **Suggested snippet:** Create one matching public value and one non-matching value accepted by the parameter type, call `HttpApiMiddleware.isSecurity` for both, and access a narrowed property in the true branch to demonstrate the type predicate.
- **Optional contrast:** Use one matching and one non-matching value from the accepted input domain.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/httpapi/HttpApiMiddleware.Service`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiMiddleware.ts:320`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **recommended**
- **Current description:** Creates a `Context.Service` class for an HTTP API middleware implementation.
- **Signature hint:** `declare function Service<Self, Config extends { requires?: any; provides?: any; clientError?: any; } = { requires: never; provides: never; clientError: never; }>(): <const Id extends string, const Error extends ErrorConstraint = never, const Security extends Record<string, HttpApiSecurity.HttpApiSecurity> = never, RequiredForClient extends boolean = false>(id: Id, options?: { readonly error?: Error | undefined; readonly security?: Security | undefined; readonly requiredForClient?: RequiredForClient | undefined; } | undefined) => ServiceClass<Self, Id, { requires: 'requires' extends keyof Config ? Config['requires'] : never; provides: 'provides' extends keyof Config ? Config['provides'] : never; error: Error; clientError: 'clientError' extends keyof Config ? Config['clientError'] : never; requiredForClient: RequiredForClient; security: Security; }>`
- **Import guidance:** Start from `import { HttpApiMiddleware } from "effect/unstable/httpapi"` and use `HttpApiMiddleware.Service`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Creates a `Context.Service` class for an HTTP API middleware implementation. Call `HttpApiMiddleware.Service` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `effect/unstable/httpapi/HttpApiMiddleware.ServiceClass`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiMiddleware.ts:272`
- **Kind / category:** `root-declaration` / `schemas`
- **Priority:** **optional**
- **Current description:** Class type produced by `Service` for an HTTP API middleware service.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/httpapi/HttpApiMiddleware.ServiceClass`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/HttpApiMiddleware.HttpApiMiddleware`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiMiddleware.ts:64`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Server-side middleware function for an HTTP API endpoint.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/httpapi/HttpApiMiddleware.HttpApiMiddleware`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/HttpApiMiddleware.HttpApiMiddlewareSecurity`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiMiddleware.ts:83`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Server-side middleware implementations for one or more security schemes.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/httpapi/HttpApiMiddleware.HttpApiMiddlewareSecurity`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/HttpApiMiddleware.HttpApiMiddlewareClient`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiMiddleware.ts:114`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Client-side middleware function for generated HTTP API clients.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/httpapi/HttpApiMiddleware.HttpApiMiddlewareClient`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/HttpApiMiddleware.ForClient`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiMiddleware.ts:131`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Client-side service marker required when a middleware declares `requiredForClient`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/httpapi/HttpApiMiddleware.ForClient`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/HttpApiMiddleware.AnyService`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiMiddleware.ts:142`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Base service key shape for HTTP API middleware services, including provided services, declared error schemas, and client requirements.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/httpapi/HttpApiMiddleware.AnyService`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/HttpApiMiddleware.AnyServiceSecurity`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiMiddleware.ts:156`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Middleware service key shape for security middleware, including the security schemes handled by the service.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/httpapi/HttpApiMiddleware.AnyServiceSecurity`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/HttpApiMiddleware.AnyId`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiMiddleware.ts:167`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Type-level identifier carried by middleware services to track provided services, required services, errors, client errors, and client requirements.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/httpapi/HttpApiMiddleware.AnyId`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/HttpApiMiddleware.Provides`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiMiddleware.ts:183`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Extracts the services provided by a middleware identifier.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/httpapi/HttpApiMiddleware.Provides`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/HttpApiMiddleware.Requires`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiMiddleware.ts:191`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Extracts the services required to run a middleware implementation.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/httpapi/HttpApiMiddleware.Requires`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/HttpApiMiddleware.ApplyServices`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiMiddleware.ts:199`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Applies a middleware's service changes to an existing requirement type by removing services it provides and adding services it requires.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/httpapi/HttpApiMiddleware.ApplyServices`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/HttpApiMiddleware.ErrorSchema`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiMiddleware.ts:207`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Extracts the schema or schema union used for errors declared by a middleware identifier.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/httpapi/HttpApiMiddleware.ErrorSchema`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/HttpApiMiddleware.Error`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiMiddleware.ts:216`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Extracts the decoded error type declared by a middleware identifier.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/httpapi/HttpApiMiddleware.Error`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/HttpApiMiddleware.ClientError`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiMiddleware.ts:224`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Extracts the client-side error type for middleware that is required on generated clients.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/httpapi/HttpApiMiddleware.ClientError`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/HttpApiMiddleware.MiddlewareClient`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiMiddleware.ts:238`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Computes the client-side service marker required for middleware that must also run in generated clients.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/httpapi/HttpApiMiddleware.MiddlewareClient`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/HttpApiMiddleware.ErrorServicesEncode`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiMiddleware.ts:251`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Extracts the schema services required to encode errors declared by a middleware identifier.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/httpapi/HttpApiMiddleware.ErrorServicesEncode`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/httpapi/HttpApiMiddleware.ErrorServicesDecode`

- **Source:** `packages/effect/src/unstable/httpapi/HttpApiMiddleware.ts:259`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Extracts the schema services required to decode errors declared by a middleware identifier.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/httpapi/HttpApiMiddleware.ErrorServicesDecode`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.
