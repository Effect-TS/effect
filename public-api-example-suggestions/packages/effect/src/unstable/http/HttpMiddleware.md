# Example Suggestions: `effect/unstable/http/HttpMiddleware`

- **Package:** `effect`
- **Source:** `packages/effect/src/unstable/http/HttpMiddleware.ts`
- **Uncovered API records:** 13
- **Priorities:** 0 required, 7 recommended, 6 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                                | Line | Kind                    | Priority        |
| ------------------------------------------------------------------ | ---: | ----------------------- | --------------- |
| `effect/unstable/http/HttpMiddleware.layerTracerDisabledForUrls`   |  114 | `root-declaration`      | **recommended** |
| `effect/unstable/http/HttpMiddleware.withLoggerDisabled`           |   90 | `root-declaration`      | **recommended** |
| `effect/unstable/http/HttpMiddleware.logger`                       |  135 | `root-declaration`      | **recommended** |
| `effect/unstable/http/HttpMiddleware.tracer`                       |  176 | `root-declaration`      | **recommended** |
| `effect/unstable/http/HttpMiddleware.xForwardedHeaders`            |  249 | `root-declaration`      | **recommended** |
| `effect/unstable/http/HttpMiddleware.searchParamsParser`           |  269 | `root-declaration`      | **recommended** |
| `effect/unstable/http/HttpMiddleware.cors`                         |  289 | `root-declaration`      | **recommended** |
| `effect/unstable/http/HttpMiddleware.make`                         |   67 | `root-declaration`      | **optional**    |
| `effect/unstable/http/HttpMiddleware.TracerDisabledWhen`           |  103 | `root-declaration`      | **optional**    |
| `effect/unstable/http/HttpMiddleware.SpanNameGenerator`            |  124 | `root-declaration`      | **optional**    |
| `effect/unstable/http/HttpMiddleware.HttpMiddleware (type) (type)` |   40 | `root-declaration`      | **optional**    |
| `effect/unstable/http/HttpMiddleware.HttpMiddleware (type) (type)` |   49 | `namespace`             | **optional**    |
| `effect/unstable/http/HttpMiddleware.HttpMiddleware.Applied`       |   56 | `namespace-declaration` | **optional**    |

## Recommended

### `effect/unstable/http/HttpMiddleware.layerTracerDisabledForUrls`

- **Source:** `packages/effect/src/unstable/http/HttpMiddleware.ts:114`
- **Kind / category:** `root-declaration` / `Tracer`
- **Priority:** **recommended**
- **Current description:** Creates a layer that disables server-side tracing for requests whose URL exactly matches one of the supplied URLs.
- **Signature hint:** `declare function layerTracerDisabledForUrls(urls: ReadonlyArray<string>): Layer.Layer<never>`
- **Import guidance:** Start from `import { HttpMiddleware } from "effect/unstable/http"` and use `HttpMiddleware.layerTracerDisabledForUrls`.
- **Suggested snippet:** Use the public setup or registry consumed by `HttpMiddleware.layerTracerDisabledForUrls`, apply the layer, and assert the registration, migration, route, resource, or other side effect documented by nearby tests. The layer provides no service, so do not write an example that yields a service from context.
- **Optional contrast:** Use `TestClock` or explicit synchronization rather than elapsed wall time.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/HttpMiddleware.withLoggerDisabled`

- **Source:** `packages/effect/src/unstable/http/HttpMiddleware.ts:90`
- **Kind / category:** `root-declaration` / `Logger`
- **Priority:** **recommended**
- **Current description:** Runs an effect with HTTP response logging disabled for the current server request.
- **Signature hint:** `declare function withLoggerDisabled<A, E, R>(self: Effect.Effect<A, E, R>): Effect.Effect<A, E, R | HttpServerRequest>`
- **Import guidance:** Start from `import { HttpMiddleware } from "effect/unstable/http"` and use `HttpMiddleware.withLoggerDisabled`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `HttpMiddleware.withLoggerDisabled`, execute it explicitly, and assert its semantic success value or captured failure.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/HttpMiddleware.logger`

- **Source:** `packages/effect/src/unstable/http/HttpMiddleware.ts:135`
- **Kind / category:** `root-declaration` / `Logger`
- **Priority:** **recommended**
- **Current description:** Middleware that logs sent HTTP responses with request method, request URL, and response status annotations.
- **Signature hint:** `declare function logger<E, R>(httpApp: Effect.Effect<HttpServerResponse, E, HttpServerRequest | R>): Effect.Effect<HttpServerResponse, E, HttpServerRequest | R>`
- **Import guidance:** Start from `import { HttpMiddleware } from "effect/unstable/http"` and use `HttpMiddleware.logger`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `HttpMiddleware.logger`, execute it explicitly, and assert its semantic success value or captured failure.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/HttpMiddleware.tracer`

- **Source:** `packages/effect/src/unstable/http/HttpMiddleware.ts:176`
- **Kind / category:** `root-declaration` / `Tracer`
- **Priority:** **recommended**
- **Current description:** Middleware that creates a server trace span for each request and records request and response HTTP attributes.
- **Signature hint:** `declare function tracer<E, R>(httpApp: Effect.Effect<HttpServerResponse, E, HttpServerRequest | R>): Effect.Effect<HttpServerResponse, E, HttpServerRequest | R>`
- **Import guidance:** Start from `import { HttpMiddleware } from "effect/unstable/http"` and use `HttpMiddleware.tracer`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `HttpMiddleware.tracer`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Use `TestClock` or explicit synchronization rather than elapsed wall time.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/HttpMiddleware.xForwardedHeaders`

- **Source:** `packages/effect/src/unstable/http/HttpMiddleware.ts:249`
- **Kind / category:** `root-declaration` / `Proxying`
- **Priority:** **recommended**
- **Current description:** Middleware that trusts `X-Forwarded-Host` and `X-Forwarded-For`, updating the request host header and remote address.
- **Signature hint:** `declare function xForwardedHeaders<E, R>(httpApp: Effect.Effect<Response.HttpServerResponse, E, HttpServerRequest | R>): Effect.Effect<Response.HttpServerResponse, E, HttpServerRequest | R>`
- **Import guidance:** Start from `import { HttpMiddleware } from "effect/unstable/http"` and use `HttpMiddleware.xForwardedHeaders`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `HttpMiddleware.xForwardedHeaders`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Include the absent or empty input only when it teaches a distinct return value.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/HttpMiddleware.searchParamsParser`

- **Source:** `packages/effect/src/unstable/http/HttpMiddleware.ts:269`
- **Kind / category:** `root-declaration` / `search params`
- **Priority:** **recommended**
- **Current description:** Middleware that parses the current request URL's search parameters and provides them as `ParsedSearchParams`.
- **Signature hint:** `declare function searchParamsParser<E, R>(httpApp: Effect.Effect<HttpServerResponse, E, R>): Effect.Effect<Response.HttpServerResponse, E, HttpServerRequest | Exclude<R, Request.ParsedSearchParams>>`
- **Import guidance:** Start from `import { HttpMiddleware } from "effect/unstable/http"` and use `HttpMiddleware.searchParamsParser`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `HttpMiddleware.searchParamsParser`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/HttpMiddleware.cors`

- **Source:** `packages/effect/src/unstable/http/HttpMiddleware.ts:289`
- **Kind / category:** `root-declaration` / `CORS`
- **Priority:** **recommended**
- **Current description:** Middleware that handles CORS preflight requests and adds configured CORS headers to HTTP responses.
- **Signature hint:** `declare function cors(options?: { readonly allowedOrigins?: ReadonlyArray<string> | Predicate<string> | undefined; readonly allowedMethods?: ReadonlyArray<string> | undefined; readonly allowedHeaders?: ReadonlyArray<string> | undefined; readonly exposedHeaders?: ReadonlyArray<string> | undefined; readonly maxAge?: number | undefined; readonly credentials?: boolean | undefined; }): <E, R>(httpApp: Effect.Effect<HttpServerResponse, E, R>) => Effect.Effect<HttpServerResponse, E, R | HttpServerRequest>`
- **Import guidance:** Start from `import { HttpMiddleware } from "effect/unstable/http"` and use `HttpMiddleware.cors`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `HttpMiddleware.cors`, execute it explicitly, and assert its semantic success value or captured failure.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `effect/unstable/http/HttpMiddleware.make`

- **Source:** `packages/effect/src/unstable/http/HttpMiddleware.ts:67`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Defines an `HttpMiddleware` while preserving its precise type.
- **Signature hint:** `declare function make<M extends HttpMiddleware>(middleware: M): M`
- **Import guidance:** Start from `import { HttpMiddleware } from "effect/unstable/http"` and use `HttpMiddleware.make`.
- **Suggested snippet:** Construct one representative value with `HttpMiddleware.make`, then pass it to the smallest canonical getter, matcher, or runner that exposes what was created. Do not merely assert an object kind.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/HttpMiddleware.TracerDisabledWhen`

- **Source:** `packages/effect/src/unstable/http/HttpMiddleware.ts:103`
- **Kind / category:** `root-declaration` / `Tracer`
- **Priority:** **optional**
- **Current description:** Context reference for a predicate that disables server-side tracing for matching requests.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { HttpMiddleware } from "effect/unstable/http"` and use `HttpMiddleware.TracerDisabledWhen`.
- **Suggested snippet:** Consume `HttpMiddleware.TracerDisabledWhen` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Optional contrast:** Use `TestClock` or explicit synchronization rather than elapsed wall time.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/HttpMiddleware.SpanNameGenerator`

- **Source:** `packages/effect/src/unstable/http/HttpMiddleware.ts:124`
- **Kind / category:** `root-declaration` / `Tracer`
- **Priority:** **optional**
- **Current description:** Context reference for generating server span names from HTTP server requests.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { HttpMiddleware } from "effect/unstable/http"` and use `HttpMiddleware.SpanNameGenerator`.
- **Suggested snippet:** Consume `HttpMiddleware.SpanNameGenerator` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/HttpMiddleware.HttpMiddleware (type) (type)`

- **Source:** `packages/effect/src/unstable/http/HttpMiddleware.ts:40`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Middleware that transforms an HTTP server app effect into another HTTP server app effect.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/http/HttpMiddleware.HttpMiddleware (type)`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/HttpMiddleware.HttpMiddleware (type) (type)`

- **Source:** `packages/effect/src/unstable/http/HttpMiddleware.ts:49`
- **Kind / category:** `namespace` / `none`
- **Priority:** **optional**
- **Current description:** Namespace containing types associated with `HttpMiddleware`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/http/HttpMiddleware.HttpMiddleware (type)`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/HttpMiddleware.HttpMiddleware.Applied`

- **Source:** `packages/effect/src/unstable/http/HttpMiddleware.ts:56`
- **Kind / category:** `namespace-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Callable type representing middleware already specialized to a particular transformed app type.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/http/HttpMiddleware.HttpMiddleware.Applied`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.
