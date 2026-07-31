# Example Suggestions: `@effect/platform-deno/DenoHttpServer`

- **Package:** `@effect/platform-deno`
- **Source:** `packages/platform-deno/src/DenoHttpServer.ts`
- **Uncovered API records:** 7
- **Priorities:** 0 required, 5 recommended, 2 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                      | Line | Kind               | Priority        |
| -------------------------------------------------------- | ---: | ------------------ | --------------- |
| `@effect/platform-deno/DenoHttpServer.make`              |   66 | `root-declaration` | **recommended** |
| `@effect/platform-deno/DenoHttpServer.layerServer`       |  213 | `root-declaration` | **recommended** |
| `@effect/platform-deno/DenoHttpServer.layer`             |  242 | `root-declaration` | **recommended** |
| `@effect/platform-deno/DenoHttpServer.layerConfig`       |  272 | `root-declaration` | **recommended** |
| `@effect/platform-deno/DenoHttpServer.layerHttpServices` |  230 | `root-declaration` | **recommended** |
| `@effect/platform-deno/DenoHttpServer.ServeOptions`      |   56 | `root-declaration` | **optional**    |
| `@effect/platform-deno/DenoHttpServer.layerTest`         |  257 | `root-declaration` | **optional**    |

## Recommended

### `@effect/platform-deno/DenoHttpServer.make`

- **Source:** `packages/platform-deno/src/DenoHttpServer.ts:66`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Creates a scoped native Deno HTTP server.
- **Signature hint:** `declare function make(options: any): Effect.Effect<{ readonly serve: { <E, R>(effect: Effect.Effect<ServerResponse.HttpServerResponse, E, R>): Effect.Effect<void, never, Exclude<R, ServerRequest.HttpServerRequest> | Scope.Scope>; <E, R, App extends Effect.Effect<ServerResponse.HttpServerResponse, any, any>>(effect: Effect.Effect<ServerResponse.HttpServerResponse, E, R>, middleware: HttpMiddleware.Applied<App, E, R>): Effect.Effect<void, never, Exclude<R, ServerRequest.HttpServerRequest> | Scope.Scope>; }; readonly address: Server.Address; }, never, Scope.Scope>`
- **Import guidance:** Start from `import { DenoHttpServer } from "@effect/platform-deno"` and use `DenoHttpServer.make`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `DenoHttpServer.make`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Record acquisition and release events and assert cleanup after the scope closes.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/platform-deno/DenoHttpServer.layerServer`

- **Source:** `packages/platform-deno/src/DenoHttpServer.ts:213`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Provides only the native Deno HTTP server.
- **Signature hint:** `declare function layerServer(options: ServeOptions & { readonly disablePreemptiveShutdown?: boolean | undefined; readonly gracefulShutdownTimeout?: Duration.Input | undefined; readonly websocket?: Deno.UpgradeWebSocketOptions | undefined; }): Layer.Layer<Server.HttpServer>`
- **Import guidance:** Start from `import { DenoHttpServer } from "@effect/platform-deno"` and use `DenoHttpServer.layerServer`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `DenoHttpServer.layerServer`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Optional contrast:** Use `TestClock` or explicit synchronization rather than elapsed wall time.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/platform-deno/DenoHttpServer.layer`

- **Source:** `packages/platform-deno/src/DenoHttpServer.ts:242`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Provides a native Deno HTTP server together with Deno HTTP services.
- **Signature hint:** `declare function layer(options: ServeOptions & { readonly disablePreemptiveShutdown?: boolean | undefined; readonly gracefulShutdownTimeout?: Duration.Input | undefined; readonly websocket?: Deno.UpgradeWebSocketOptions | undefined; }): Layer.Layer<Server.HttpServer | HttpPlatform | Etag.Generator | DenoServices.DenoServices>`
- **Import guidance:** Start from `import { DenoHttpServer } from "@effect/platform-deno"` and use `DenoHttpServer.layer`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `DenoHttpServer.layer`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Optional contrast:** Use `TestClock` or explicit synchronization rather than elapsed wall time.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/platform-deno/DenoHttpServer.layerConfig`

- **Source:** `packages/platform-deno/src/DenoHttpServer.ts:272`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Creates the Deno HTTP server and support-services layer from configurable options.
- **Signature hint:** `declare function layerConfig(options: Config.Wrap<ServeOptions & { readonly disablePreemptiveShutdown?: boolean | undefined; readonly gracefulShutdownTimeout?: Duration.Input | undefined; readonly websocket?: Deno.UpgradeWebSocketOptions | undefined; }>): Layer.Layer<Server.HttpServer | HttpPlatform | FileSystem.FileSystem | Etag.Generator | Path.Path, ConfigError>`
- **Import guidance:** Start from `import { DenoHttpServer } from "@effect/platform-deno"` and use `DenoHttpServer.layerConfig`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `DenoHttpServer.layerConfig`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Optional contrast:** Use `TestClock` or explicit synchronization rather than elapsed wall time.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/platform-deno/DenoHttpServer.layerHttpServices`

- **Source:** `packages/platform-deno/src/DenoHttpServer.ts:230`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Provides Deno HTTP platform services and the standard Deno service set.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { DenoHttpServer } from "@effect/platform-deno"` and use `DenoHttpServer.layerHttpServices`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `DenoHttpServer.layerHttpServices`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `@effect/platform-deno/DenoHttpServer.ServeOptions`

- **Source:** `packages/platform-deno/src/DenoHttpServer.ts:56`
- **Kind / category:** `root-declaration` / `options`
- **Priority:** **optional**
- **Current description:** Native Deno TCP, TLS, or Unix serve options managed by the scoped server.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/platform-deno/DenoHttpServer.ServeOptions`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Record acquisition and release events and assert cleanup after the scope closes.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/platform-deno/DenoHttpServer.layerTest`

- **Source:** `packages/platform-deno/src/DenoHttpServer.ts:257`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **optional**
- **Current description:** Starts a Deno HTTP server on an ephemeral loopback port for tests.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { DenoHttpServer } from "@effect/platform-deno"` and use `DenoHttpServer.layerTest`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `DenoHttpServer.layerTest`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.
