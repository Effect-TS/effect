# Example Suggestions: `@effect/platform-bun/BunHttpServer`

- **Package:** `@effect/platform-bun`
- **Source:** `packages/platform-bun/src/BunHttpServer.ts`
- **Uncovered API records:** 8
- **Priorities:** 1 required, 5 recommended, 2 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                    | Line | Kind               | Priority        |
| ------------------------------------------------------ | ---: | ------------------ | --------------- |
| `@effect/platform-bun/BunHttpServer.make`              |   94 | `root-declaration` | **required**    |
| `@effect/platform-bun/BunHttpServer.layerServer`       |  253 | `root-declaration` | **recommended** |
| `@effect/platform-bun/BunHttpServer.layerHttpServices` |  267 | `root-declaration` | **recommended** |
| `@effect/platform-bun/BunHttpServer.layer`             |  283 | `root-declaration` | **recommended** |
| `@effect/platform-bun/BunHttpServer.layerTest`         |  302 | `root-declaration` | **recommended** |
| `@effect/platform-bun/BunHttpServer.layerConfig`       |  317 | `root-declaration` | **recommended** |
| `@effect/platform-bun/BunHttpServer.ServeOptions`      |   62 | `root-declaration` | **optional**    |
| `@effect/platform-bun/BunHttpServer.WebSocketOptions`  |   83 | `root-declaration` | **optional**    |

## Required

### `@effect/platform-bun/BunHttpServer.make`

- **Source:** `packages/platform-bun/src/BunHttpServer.ts:94`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **required**
- **Current description:** Creates a scoped Bun `HttpServer` from `Bun.serve` options, stopping the server on scope finalization with optional graceful shutdown settings.
- **Signature hint:** `declare function make<R extends string>(options: ServeOptions<R> & { readonly disablePreemptiveShutdown?: boolean | undefined; readonly gracefulShutdownTimeout?: Duration.Input | undefined; readonly websocket?: WebSocketOptions | undefined; }): Effect.Effect<{ readonly serve: { <E, R>(effect: Effect.Effect<ServerResponse.HttpServerResponse, E, R>): Effect.Effect<void, never, Exclude<R, ServerRequest.HttpServerRequest> | Scope.Scope>; <E, R, App extends Effect.Effect<ServerResponse.HttpServerResponse, any, any>>(effect: Effect.Effect<ServerResponse.HttpServerResponse, E, R>, middleware: HttpMiddleware.Applied<App, E, R>): Effect.Effect<void, never, Exclude<R, ServerRequest.HttpServerRequest> | Scope.Scope>; }; readonly address: Server.Address; }, never, Scope.Scope>`
- **Import guidance:** Start from `import { BunHttpServer } from "@effect/platform-bun"` and use `BunHttpServer.make`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `BunHttpServer.make`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Record acquisition and release events and assert cleanup after the scope closes.
- **Future-agent advice:** Inspect implementation and targeted tests first; preserve lifecycle and failure semantics and validate with doctest plus package-local docgen.

## Recommended

### `@effect/platform-bun/BunHttpServer.layerServer`

- **Source:** `packages/platform-bun/src/BunHttpServer.ts:253`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Layer that provides only `HttpServer` by constructing a scoped Bun server from the supplied serve options.
- **Signature hint:** `declare function layerServer<R extends string>(options: ServeOptions<R> & { readonly disablePreemptiveShutdown?: boolean | undefined; readonly gracefulShutdownTimeout?: Duration.Input | undefined; readonly websocket?: WebSocketOptions | undefined; }): Layer.Layer<Server.HttpServer>`
- **Import guidance:** Start from `import { BunHttpServer } from "@effect/platform-bun"` and use `BunHttpServer.layerServer`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `BunHttpServer.layerServer`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Optional contrast:** Record acquisition and release events and assert cleanup after the scope closes.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/platform-bun/BunHttpServer.layerHttpServices`

- **Source:** `packages/platform-bun/src/BunHttpServer.ts:267`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Layer that provides Bun HTTP support services: `HttpPlatform`, weak ETag generation, and `BunServices`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { BunHttpServer } from "@effect/platform-bun"` and use `BunHttpServer.layerHttpServices`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `BunHttpServer.layerHttpServices`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/platform-bun/BunHttpServer.layer`

- **Source:** `packages/platform-bun/src/BunHttpServer.ts:283`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Layer that provides a Bun `HttpServer` together with the Bun HTTP platform, ETag generator, and Bun services.
- **Signature hint:** `declare function layer<R extends string>(options: ServeOptions<R> & { readonly disablePreemptiveShutdown?: boolean | undefined; readonly gracefulShutdownTimeout?: Duration.Input | undefined; readonly websocket?: WebSocketOptions | undefined; }): Layer.Layer<Server.HttpServer | HttpPlatform | Etag.Generator | BunServices.BunServices>`
- **Import guidance:** Start from `import { BunHttpServer } from "@effect/platform-bun"` and use `BunHttpServer.layer`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `BunHttpServer.layer`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Optional contrast:** Use `TestClock` or explicit synchronization rather than elapsed wall time.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/platform-bun/BunHttpServer.layerTest`

- **Source:** `packages/platform-bun/src/BunHttpServer.ts:302`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Layer that starts a Bun HTTP server on an ephemeral port for tests.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { BunHttpServer } from "@effect/platform-bun"` and use `BunHttpServer.layerTest`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `BunHttpServer.layerTest`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/platform-bun/BunHttpServer.layerConfig`

- **Source:** `packages/platform-bun/src/BunHttpServer.ts:317`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Creates the Bun HTTP server and support-services layer from configurable serve options.
- **Signature hint:** `declare function layerConfig<R extends string>(options: Config.Wrap<ServeOptions<R> & { readonly disablePreemptiveShutdown?: boolean | undefined; readonly gracefulShutdownTimeout?: Duration.Input | undefined; readonly websocket?: WebSocketOptions | undefined; }>): Layer.Layer<Server.HttpServer | HttpPlatform | FileSystem.FileSystem | Etag.Generator | Path.Path, ConfigError>`
- **Import guidance:** Start from `import { BunHttpServer } from "@effect/platform-bun"` and use `BunHttpServer.layerConfig`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `BunHttpServer.layerConfig`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Optional contrast:** Use `TestClock` or explicit synchronization rather than elapsed wall time.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `@effect/platform-bun/BunHttpServer.ServeOptions`

- **Source:** `packages/platform-bun/src/BunHttpServer.ts:62`
- **Kind / category:** `root-declaration` / `options`
- **Priority:** **optional**
- **Current description:** Bun serve options accepted by the HTTP server, extended with typed route definitions.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/platform-bun/BunHttpServer.ServeOptions`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/platform-bun/BunHttpServer.WebSocketOptions`

- **Source:** `packages/platform-bun/src/BunHttpServer.ts:83`
- **Kind / category:** `root-declaration` / `options`
- **Priority:** **optional**
- **Current description:** WebSocket tuning options forwarded to `Bun.serve`'s `websocket` handler.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/platform-bun/BunHttpServer.WebSocketOptions`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.
