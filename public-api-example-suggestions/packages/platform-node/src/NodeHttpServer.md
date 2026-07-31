# Example Suggestions: `@effect/platform-node/NodeHttpServer`

- **Package:** `@effect/platform-node`
- **Source:** `packages/platform-node/src/NodeHttpServer.ts`
- **Uncovered API records:** 10
- **Priorities:** 1 required, 5 recommended, 4 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                       | Line | Kind               | Priority        |
| --------------------------------------------------------- | ---: | ------------------ | --------------- |
| `@effect/platform-node/NodeHttpServer.make`               |   93 | `root-declaration` | **required**    |
| `@effect/platform-node/NodeHttpServer.makeHandler`        |  187 | `root-declaration` | **recommended** |
| `@effect/platform-node/NodeHttpServer.makeUpgradeHandler` |  229 | `root-declaration` | **recommended** |
| `@effect/platform-node/NodeHttpServer.layerServer`        |  415 | `root-declaration` | **recommended** |
| `@effect/platform-node/NodeHttpServer.layer`              |  442 | `root-declaration` | **recommended** |
| `@effect/platform-node/NodeHttpServer.layerConfig`        |  462 | `root-declaration` | **recommended** |
| `@effect/platform-node/NodeHttpServer.layerTest`          |  483 | `root-declaration` | **optional**    |
| `@effect/platform-node/NodeHttpServer.Options`            |   71 | `root-declaration` | **optional**    |
| `@effect/platform-node/NodeHttpServer.layerHttpServices`  |  427 | `root-declaration` | **optional**    |
| `@effect/platform-node/NodeHttpServer.Options.websocket`  |   80 | `member`           | **optional**    |

## Required

### `@effect/platform-node/NodeHttpServer.make`

- **Source:** `packages/platform-node/src/NodeHttpServer.ts:93`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **required**
- **Current description:** Creates a scoped `HttpServer` from a Node `http.Server`, starts listening with the supplied options, registers request and upgrade handling, and closes the server during scope finalization with optional graceful-shutdown control.
- **Signature hint:** `declare function make(evaluate: LazyArg<Http.Server<typeof Http.IncomingMessage, typeof Http.ServerResponse>>, options: Options): Effect.Effect<{ readonly serve: { <E, R>(effect: Effect.Effect<HttpServerResponse, E, R>): Effect.Effect<void, never, Exclude<R, HttpServerRequest> | Scope.Scope>; <E, R, App extends Effect.Effect<HttpServerResponse, any, any>>(effect: Effect.Effect<HttpServerResponse, E, R>, middleware: Middleware.HttpMiddleware.Applied<App, E, R>): Effect.Effect<void, never, Exclude<R, HttpServerRequest> | Scope.Scope>; }; readonly address: HttpServer.Address; }, ServeError, Scope.Scope>`
- **Import guidance:** Start from `import { NodeHttpServer } from "@effect/platform-node"` and use `NodeHttpServer.make`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `NodeHttpServer.make`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Record acquisition and release events and assert cleanup after the scope closes.
- **Future-agent advice:** Inspect implementation and targeted tests first; preserve lifecycle and failure semantics and validate with doctest plus package-local docgen.

## Recommended

### `@effect/platform-node/NodeHttpServer.makeHandler`

- **Source:** `packages/platform-node/src/NodeHttpServer.ts:187`
- **Kind / category:** `root-declaration` / `handlers`
- **Priority:** **recommended**
- **Current description:** Creates a Node `request` event handler for an Effect HTTP application, injecting a `HttpServerRequest` and interrupting the request fiber if the client closes the response before it finishes.
- **Signature hint:** `declare function makeHandler<R, E, App extends Effect.Effect<HttpServerResponse, any, any> = Effect.Effect<HttpServerResponse, E, R>>(httpEffect: Effect.Effect<HttpServerResponse, E, R>, options: { readonly scope: Scope.Scope; readonly middleware?: Middleware.HttpMiddleware.Applied<App, E, R> | undefined; }): Effect.Effect<(nodeRequest: Http.IncomingMessage, nodeResponse: Http.ServerResponse) => void, never, Exclude<Effect.Services<App>, HttpServerRequest | Scope.Scope>>`
- **Import guidance:** Start from `import { NodeHttpServer } from "@effect/platform-node"` and use `NodeHttpServer.makeHandler`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `NodeHttpServer.makeHandler`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Use `TestClock` or explicit synchronization rather than elapsed wall time.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/platform-node/NodeHttpServer.makeUpgradeHandler`

- **Source:** `packages/platform-node/src/NodeHttpServer.ts:229`
- **Kind / category:** `root-declaration` / `handlers`
- **Priority:** **recommended**
- **Current description:** Creates a Node `upgrade` event handler for an Effect HTTP application, exposing the upgraded WebSocket as the request's `upgrade` effect and interrupting the request fiber when the socket closes early.
- **Signature hint:** `declare function makeUpgradeHandler<R, E, App extends Effect.Effect<HttpServerResponse, any, any> = Effect.Effect<HttpServerResponse, E, R>>(lazyWss: Effect.Effect<NodeWS.WebSocketServer>, httpEffect: Effect.Effect<HttpServerResponse, E, R>, options: { readonly scope: Scope.Scope; readonly middleware?: Middleware.HttpMiddleware.Applied<App, E, R> | undefined; }): Effect.Effect<(nodeRequest: Http.IncomingMessage, socket: Duplex, head: Buffer) => void, never, Exclude<Effect.Services<App>, HttpServerRequest | Scope.Scope>>`
- **Import guidance:** Start from `import { NodeHttpServer } from "@effect/platform-node"` and use `NodeHttpServer.makeUpgradeHandler`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `NodeHttpServer.makeUpgradeHandler`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Use `TestClock` or explicit synchronization rather than elapsed wall time.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/platform-node/NodeHttpServer.layerServer`

- **Source:** `packages/platform-node/src/NodeHttpServer.ts:415`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Provides an `HttpServer` by creating and managing a scoped Node `http.Server` with the supplied listen and shutdown options.
- **Signature hint:** `declare function layerServer(evaluate: LazyArg<Http.Server<typeof Http.IncomingMessage, typeof Http.ServerResponse>>, options: Options): Layer.Layer<HttpServer.HttpServer, ServeError>`
- **Import guidance:** Start from `import { NodeHttpServer } from "@effect/platform-node"` and use `NodeHttpServer.layerServer`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `NodeHttpServer.layerServer`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Optional contrast:** Record acquisition and release events and assert cleanup after the scope closes.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/platform-node/NodeHttpServer.layer`

- **Source:** `packages/platform-node/src/NodeHttpServer.ts:442`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Provides a Node `HttpServer` together with the Node HTTP platform, ETag, and core platform services required to serve requests.
- **Signature hint:** `declare function layer(evaluate: LazyArg<Http.Server>, options: Options): Layer.Layer<HttpServer.HttpServer | NodeServices.NodeServices | HttpPlatform.HttpPlatform | Etag.Generator, ServeError>`
- **Import guidance:** Start from `import { NodeHttpServer } from "@effect/platform-node"` and use `NodeHttpServer.layer`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `NodeHttpServer.layer`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/platform-node/NodeHttpServer.layerConfig`

- **Source:** `packages/platform-node/src/NodeHttpServer.ts:462`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Provides a Node `HttpServer` together with the Node HTTP platform, ETag, and core Node platform services, reading the listen and shutdown options from a `Config` value.
- **Signature hint:** `declare function layerConfig(evaluate: LazyArg<Http.Server>, options: Config.Wrap<Options>): Layer.Layer<HttpServer.HttpServer | NodeServices.NodeServices | HttpPlatform.HttpPlatform | Etag.Generator, ServeError | Config.ConfigError>`
- **Import guidance:** Start from `import { NodeHttpServer } from "@effect/platform-node"` and use `NodeHttpServer.layerConfig`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `NodeHttpServer.layerConfig`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `@effect/platform-node/NodeHttpServer.layerTest`

- **Source:** `packages/platform-node/src/NodeHttpServer.ts:483`
- **Kind / category:** `root-declaration` / `testing`
- **Priority:** **optional**
- **Current description:** Provides a test HTTP server listening on an ephemeral port together with a Fetch-backed `HttpClient` configured for server integration tests.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { NodeHttpServer } from "@effect/platform-node"` and use `NodeHttpServer.layerTest`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `NodeHttpServer.layerTest`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/platform-node/NodeHttpServer.Options`

- **Source:** `packages/platform-node/src/NodeHttpServer.ts:71`
- **Kind / category:** `root-declaration` / `options`
- **Priority:** **optional**
- **Current description:** Options accepted by the Node `HttpServer` constructors and layers.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/platform-node/NodeHttpServer.Options`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/platform-node/NodeHttpServer.layerHttpServices`

- **Source:** `packages/platform-node/src/NodeHttpServer.ts:427`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **optional**
- **Current description:** Provides the Node HTTP support services used by `NodeHttpServer`, including the HTTP platform, ETag generator, and core Node platform services.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { NodeHttpServer } from "@effect/platform-node"` and use `NodeHttpServer.layerHttpServices`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `NodeHttpServer.layerHttpServices`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/platform-node/NodeHttpServer.Options.websocket`

- **Source:** `packages/platform-node/src/NodeHttpServer.ts:80`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Options forwarded to the underlying `ws` `WebSocketServer`, minus the wiring options the server manages itself. Use this to enable `permessage-deflate` compression or tune payload limits, e.g. `websocket: { perMessageDeflate: true }`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `@effect/platform-node/NodeHttpServer.Options.websocket` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.
