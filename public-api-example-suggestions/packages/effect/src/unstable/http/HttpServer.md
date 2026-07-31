# Example Suggestions: `effect/unstable/http/HttpServer`

- **Package:** `effect`
- **Source:** `packages/effect/src/unstable/http/HttpServer.ts`
- **Uncovered API records:** 14
- **Priorities:** 0 required, 7 recommended, 7 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                    | Line | Kind               | Priority        |
| ------------------------------------------------------ | ---: | ------------------ | --------------- |
| `effect/unstable/http/HttpServer.make`                 |  100 | `root-declaration` | **recommended** |
| `effect/unstable/http/HttpServer.serve`                |  123 | `root-declaration` | **recommended** |
| `effect/unstable/http/HttpServer.serveEffect`          |  172 | `root-declaration` | **recommended** |
| `effect/unstable/http/HttpServer.withLogAddress`       |  256 | `root-declaration` | **recommended** |
| `effect/unstable/http/HttpServer.layerTestClient`      |  300 | `root-declaration` | **recommended** |
| `effect/unstable/http/HttpServer.layerServices`        |  318 | `root-declaration` | **recommended** |
| `effect/unstable/http/HttpServer.addressFormattedWith` |  232 | `root-declaration` | **recommended** |
| `effect/unstable/http/HttpServer.makeTestClient`       |  278 | `root-declaration` | **optional**    |
| `effect/unstable/http/HttpServer.Address`              |   68 | `root-declaration` | **optional**    |
| `effect/unstable/http/HttpServer.TcpAddress`           |   76 | `root-declaration` | **optional**    |
| `effect/unstable/http/HttpServer.UnixAddress`          |   88 | `root-declaration` | **optional**    |
| `effect/unstable/http/HttpServer.formatAddress`        |  216 | `root-declaration` | **optional**    |
| `effect/unstable/http/HttpServer.logAddress`           |  246 | `root-declaration` | **optional**    |
| `effect/unstable/http/HttpServer.HttpServer`           |   38 | `root-declaration` | **optional**    |

## Recommended

### `effect/unstable/http/HttpServer.make`

- **Source:** `packages/effect/src/unstable/http/HttpServer.ts:100`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Constructs an `HttpServer` service from a serving implementation and listening address.
- **Signature hint:** `declare function make(options: { readonly serve: (httpEffect: Effect.Effect<HttpServerResponse, unknown, HttpServerRequest | Scope.Scope>, middleware?: Middleware.HttpMiddleware) => Effect.Effect<void, never, Scope.Scope>; readonly address: Address; }): HttpServer['Service']`
- **Import guidance:** Start from `import { HttpServer } from "effect/unstable/http"` and use `HttpServer.make`.
- **Suggested snippet:** Construct one representative value with `HttpServer.make`, then pass it to the smallest canonical getter, matcher, or runner that exposes what was created. Do not merely assert an object kind.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/HttpServer.serve`

- **Source:** `packages/effect/src/unstable/http/HttpServer.ts:123`
- **Kind / category:** `root-declaration` / `accessors`
- **Priority:** **recommended**
- **Current description:** Creates a layer that starts serving an HTTP response effect with the current `HttpServer`.
- **Signature hint:** `declare function serve(): <E, R>(effect: Effect.Effect<HttpServerResponse, E, R>) => Layer.Layer<never, never, HttpServer | Exclude<R, HttpServerRequest | Scope.Scope>> declare function serve<E, R, App extends Effect.Effect<HttpServerResponse, any, any>>(middleware: Middleware.HttpMiddleware.Applied<App, E, R>): (effect: Effect.Effect<HttpServerResponse, E, R>) => Layer.Layer<never, never, HttpServer | Exclude<Effect.Services<App>, HttpServerRequest | Scope.Scope>> declare function serve<E, R>(effect: Effect.Effect<HttpServerResponse, E, R>): Layer.Layer<never, never, HttpServer | Exclude<R, HttpServerRequest | Scope.Scope>> declare function serve<E, R, App extends Effect.Effect<HttpServerResponse, any, any>>(effect: Effect.Effect<HttpServerResponse, E, R>, middleware: Middleware.HttpMiddleware.Applied<App, E, R>): Layer.Layer<never, never, HttpServer | Exclude<Effect.Services<App>, HttpServerRequest | Scope.Scope>>`
- **Import guidance:** Start from `import { HttpServer } from "effect/unstable/http"` and use `HttpServer.serve`.
- **Suggested snippet:** Use the public setup or registry consumed by `HttpServer.serve`, apply the layer, and assert the registration, migration, route, resource, or other side effect documented by nearby tests. The layer provides no service, so do not write an example that yields a service from context.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/HttpServer.serveEffect`

- **Source:** `packages/effect/src/unstable/http/HttpServer.ts:172`
- **Kind / category:** `root-declaration` / `accessors`
- **Priority:** **recommended**
- **Current description:** Effect that starts serving an HTTP response effect with the current `HttpServer`.
- **Signature hint:** `declare function serveEffect(): <E, R>(effect: Effect.Effect<HttpServerResponse, E, R>) => Effect.Effect<void, never, Scope.Scope | HttpServer | Exclude<R, HttpServerRequest>> declare function serveEffect<E, R, App extends Effect.Effect<HttpServerResponse, any, any>>(middleware: Middleware.HttpMiddleware.Applied<App, E, R>): (effect: Effect.Effect<HttpServerResponse, E, R>) => Effect.Effect<void, never, Scope.Scope | HttpServer | Exclude<Effect.Services<App>, HttpServerRequest>> declare function serveEffect<E, R>(effect: Effect.Effect<HttpServerResponse, E, R>): Effect.Effect<void, never, Scope.Scope | HttpServer | Exclude<R, HttpServerRequest>> declare function serveEffect<E, R, App extends Effect.Effect<HttpServerResponse, any, any>>(effect: Effect.Effect<HttpServerResponse, E, R>, middleware: Middleware.HttpMiddleware.Applied<App, E, R>): Effect.Effect<void, never, Scope.Scope | HttpServer | Exclude<Effect.Services<App>, HttpServerRequest>>`
- **Import guidance:** Start from `import { HttpServer } from "effect/unstable/http"` and use `HttpServer.serveEffect`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `HttpServer.serveEffect`, execute it explicitly, and assert its semantic success value or captured failure.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/HttpServer.withLogAddress`

- **Source:** `packages/effect/src/unstable/http/HttpServer.ts:256`
- **Kind / category:** `root-declaration` / `address`
- **Priority:** **recommended**
- **Current description:** Adds address logging to a layer that provides an `HttpServer`.
- **Signature hint:** `declare function withLogAddress<A, E, R>(layer: Layer.Layer<A, E, R>): Layer.Layer<A, E, R | Exclude<HttpServer, A>>`
- **Import guidance:** Start from `import { HttpServer } from "effect/unstable/http"` and use `HttpServer.withLogAddress`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `HttpServer.withLogAddress`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/HttpServer.layerTestClient`

- **Source:** `packages/effect/src/unstable/http/HttpServer.ts:300`
- **Kind / category:** `root-declaration` / `testing`
- **Priority:** **recommended**
- **Current description:** Layer that provides the test `HttpClient` created by `makeTestClient`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { HttpServer } from "effect/unstable/http"` and use `HttpServer.layerTestClient`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `HttpServer.layerTestClient`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/HttpServer.layerServices`

- **Source:** `packages/effect/src/unstable/http/HttpServer.ts:318`
- **Kind / category:** `root-declaration` / `testing`
- **Priority:** **recommended**
- **Current description:** Layer that provides the platform services commonly needed by HTTP server tests.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { HttpServer } from "effect/unstable/http"` and use `HttpServer.layerServices`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `HttpServer.layerServices`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/http/HttpServer.addressFormattedWith`

- **Source:** `packages/effect/src/unstable/http/HttpServer.ts:232`
- **Kind / category:** `root-declaration` / `address`
- **Priority:** **recommended**
- **Current description:** Reads the current server address, formats it with `formatAddress`, and passes the formatted address to the supplied effectful function.
- **Signature hint:** `declare function addressFormattedWith<A, E, R>(f: (address: string) => Effect.Effect<A, E, R>): Effect.Effect<A, E, HttpServer | R>`
- **Import guidance:** Start from `import { HttpServer } from "effect/unstable/http"` and use `HttpServer.addressFormattedWith`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `HttpServer.addressFormattedWith`, execute it explicitly, and assert its semantic success value or captured failure.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `effect/unstable/http/HttpServer.makeTestClient`

- **Source:** `packages/effect/src/unstable/http/HttpServer.ts:278`
- **Kind / category:** `root-declaration` / `testing`
- **Priority:** **optional**
- **Current description:** Builds an `HttpClient` that sends requests to the current test HTTP server.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { HttpServer } from "effect/unstable/http"` and use `HttpServer.makeTestClient`.
- **Suggested snippet:** Construct one representative value with `HttpServer.makeTestClient`, then pass it to the smallest canonical getter, matcher, or runner that exposes what was created. Do not merely assert an object kind.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/HttpServer.Address`

- **Source:** `packages/effect/src/unstable/http/HttpServer.ts:68`
- **Kind / category:** `root-declaration` / `address`
- **Priority:** **optional**
- **Current description:** Address where an HTTP server is listening.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/http/HttpServer.Address`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/HttpServer.TcpAddress`

- **Source:** `packages/effect/src/unstable/http/HttpServer.ts:76`
- **Kind / category:** `root-declaration` / `address`
- **Priority:** **optional**
- **Current description:** TCP address for an HTTP server, identified by hostname and port.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/http/HttpServer.TcpAddress`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/HttpServer.UnixAddress`

- **Source:** `packages/effect/src/unstable/http/HttpServer.ts:88`
- **Kind / category:** `root-declaration` / `address`
- **Priority:** **optional**
- **Current description:** Unix domain socket address for an HTTP server.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/http/HttpServer.UnixAddress`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/HttpServer.formatAddress`

- **Source:** `packages/effect/src/unstable/http/HttpServer.ts:216`
- **Kind / category:** `root-declaration` / `address`
- **Priority:** **optional**
- **Current description:** Formats a server address as a display string.
- **Signature hint:** `declare function formatAddress(address: Address): string`
- **Import guidance:** Start from `import { HttpServer } from "effect/unstable/http"` and use `HttpServer.formatAddress`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Formats a server address as a display string. Call `HttpServer.formatAddress` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/HttpServer.logAddress`

- **Source:** `packages/effect/src/unstable/http/HttpServer.ts:246`
- **Kind / category:** `root-declaration` / `address`
- **Priority:** **optional**
- **Current description:** Logs the formatted address of the current HTTP server.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { HttpServer } from "effect/unstable/http"` and use `HttpServer.logAddress`.
- **Suggested snippet:** Use `HttpServer.logAddress` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/http/HttpServer.HttpServer`

- **Source:** `packages/effect/src/unstable/http/HttpServer.ts:38`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Service tag for an HTTP server runtime.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { HttpServer } from "effect/unstable/http"` and use `HttpServer.HttpServer`.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `HttpServer.HttpServer`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.
