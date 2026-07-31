# Example Suggestions: `effect/unstable/rpc/RpcServer`

- **Package:** `effect`
- **Source:** `packages/effect/src/unstable/rpc/RpcServer.ts`
- **Uncovered API records:** 21
- **Priorities:** 0 required, 5 recommended, 2 optional, 14 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                                 | Line | Kind               | Priority        |
| ------------------------------------------------------------------- | ---: | ------------------ | --------------- |
| `effect/unstable/rpc/RpcServer.makeNoSerialization`                 |   84 | `root-declaration` | **recommended** |
| `effect/unstable/rpc/RpcServer.layer`                               |  768 | `root-declaration` | **recommended** |
| `effect/unstable/rpc/RpcServer.toHttpEffect`                        | 1171 | `root-declaration` | **recommended** |
| `effect/unstable/rpc/RpcServer.toHttpEffectWebsocket`               | 1212 | `root-declaration` | **recommended** |
| `effect/unstable/rpc/RpcServer.make`                                |  489 | `root-declaration` | **recommended** |
| `effect/unstable/rpc/RpcServer.RpcServer`                           |   69 | `root-declaration` | **optional**    |
| `effect/unstable/rpc/RpcServer.Protocol.make`                       |  861 | `member`           | **optional**    |
| `effect/unstable/rpc/RpcServer.layerHttp`                           |  797 | `root-declaration` | **discouraged** |
| `effect/unstable/rpc/RpcServer.Protocol`                            |  836 | `root-declaration` | **discouraged** |
| `effect/unstable/rpc/RpcServer.makeProtocolSocketServer`            |  871 | `root-declaration` | **discouraged** |
| `effect/unstable/rpc/RpcServer.layerProtocolSocketServer`           |  886 | `root-declaration` | **discouraged** |
| `effect/unstable/rpc/RpcServer.makeProtocolWithHttpEffectWebsocket` |  899 | `root-declaration` | **discouraged** |
| `effect/unstable/rpc/RpcServer.makeProtocolWebsocket`               |  934 | `root-declaration` | **discouraged** |
| `effect/unstable/rpc/RpcServer.layerProtocolWebsocket`              |  953 | `root-declaration` | **discouraged** |
| `effect/unstable/rpc/RpcServer.makeProtocolWithHttpEffect`          |  971 | `root-declaration` | **discouraged** |
| `effect/unstable/rpc/RpcServer.makeProtocolHttp`                    | 1138 | `root-declaration` | **discouraged** |
| `effect/unstable/rpc/RpcServer.layerProtocolHttp`                   | 1158 | `root-declaration` | **discouraged** |
| `effect/unstable/rpc/RpcServer.makeProtocolStdio`                   | 1253 | `root-declaration` | **discouraged** |
| `effect/unstable/rpc/RpcServer.layerProtocolStdio`                  | 1314 | `root-declaration` | **discouraged** |
| `effect/unstable/rpc/RpcServer.makeProtocolWorkerRunner`            | 1327 | `root-declaration` | **discouraged** |
| `effect/unstable/rpc/RpcServer.layerProtocolWorkerRunner`           | 1385 | `root-declaration` | **discouraged** |

## Recommended

### `effect/unstable/rpc/RpcServer.makeNoSerialization`

- **Source:** `packages/effect/src/unstable/rpc/RpcServer.ts:84`
- **Kind / category:** `root-declaration` / `server`
- **Priority:** **recommended**
- **Current description:** Creates an RPC server for an already-decoded message channel, running handlers for a group and sending decoded server responses through `onFromServer`.
- **Signature hint:** `declare function makeNoSerialization<Rpcs extends Rpc.Any>(group: RpcGroup.RpcGroup<Rpcs>, options: { readonly onFromServer: (response: FromServer<Rpcs>) => Effect.Effect<void>; readonly disableTracing?: boolean | undefined; readonly disableSpanPropagation?: boolean | undefined; readonly spanPrefix?: string | undefined; readonly spanAttributes?: Record<string, unknown> | undefined; readonly disableClientAcks?: boolean | undefined; readonly concurrency?: number | 'unbounded' | undefined; readonly disableFatalDefects?: boolean | undefined; }): Effect.Effect<RpcServer<Rpcs>, never, Rpc.ToHandler<Rpcs> | Rpc.Middleware<Rpcs> | Scope.Scope>`
- **Import guidance:** Start from `import { RpcServer } from "effect/unstable/rpc"` and use `RpcServer.makeNoSerialization`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `RpcServer.makeNoSerialization`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Use `TestClock` or explicit synchronization rather than elapsed wall time.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/rpc/RpcServer.layer`

- **Source:** `packages/effect/src/unstable/rpc/RpcServer.ts:768`
- **Kind / category:** `root-declaration` / `server`
- **Priority:** **recommended**
- **Current description:** Provides a scoped layer that starts an RPC server for a group using the current server `Protocol`.
- **Signature hint:** `declare function layer<Rpcs extends Rpc.Any>(group: RpcGroup.RpcGroup<Rpcs>, options?: { readonly disableTracing?: boolean | undefined; readonly spanPrefix?: string | undefined; readonly spanAttributes?: Record<string, unknown> | undefined; readonly concurrency?: number | 'unbounded' | undefined; readonly disableFatalDefects?: boolean | undefined; }): Layer.Layer<never, never, Protocol | Rpc.ToHandler<Rpcs> | Rpc.Middleware<Rpcs> | Rpc.ServicesServer<Rpcs>>`
- **Import guidance:** Start from `import { RpcServer } from "effect/unstable/rpc"` and use `RpcServer.layer`.
- **Suggested snippet:** Use the public setup or registry consumed by `RpcServer.layer`, apply the layer, and assert the registration, migration, route, resource, or other side effect documented by nearby tests. The layer provides no service, so do not write an example that yields a service from context.
- **Optional contrast:** Record acquisition and release events and assert cleanup after the scope closes.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/rpc/RpcServer.toHttpEffect`

- **Source:** `packages/effect/src/unstable/rpc/RpcServer.ts:1171`
- **Kind / category:** `root-declaration` / `http app`
- **Priority:** **recommended**
- **Current description:** Starts an RPC server for a group and returns the HTTP request/response effect that serves the non-websocket HTTP RPC protocol.
- **Signature hint:** `declare function toHttpEffect<Rpcs extends Rpc.Any>(group: RpcGroup.RpcGroup<Rpcs>, options?: { readonly disableTracing?: boolean | undefined; readonly spanPrefix?: string | undefined; readonly spanAttributes?: Record<string, unknown> | undefined; readonly disableFatalDefects?: boolean | undefined; } | undefined): Effect.Effect<Effect.Effect<HttpServerResponse.HttpServerResponse, never, Scope.Scope | HttpServerRequest.HttpServerRequest>, never, Scope.Scope | RpcSerialization.RpcSerialization | Rpc.ToHandler<Rpcs> | Rpc.Middleware<Rpcs> | Rpc.ServicesServer<Rpcs>>`
- **Import guidance:** Start from `import { RpcServer } from "effect/unstable/rpc"` and use `RpcServer.toHttpEffect`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `RpcServer.toHttpEffect`, execute it explicitly, and assert its semantic success value or captured failure.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/rpc/RpcServer.toHttpEffectWebsocket`

- **Source:** `packages/effect/src/unstable/rpc/RpcServer.ts:1212`
- **Kind / category:** `root-declaration` / `http app`
- **Priority:** **recommended**
- **Current description:** Starts an RPC server for a group and returns the HTTP effect that upgrades requests to the websocket RPC protocol.
- **Signature hint:** `declare function toHttpEffectWebsocket<Rpcs extends Rpc.Any>(group: RpcGroup.RpcGroup<Rpcs>, options?: { readonly disableTracing?: boolean | undefined; readonly spanPrefix?: string | undefined; readonly spanAttributes?: Record<string, unknown> | undefined; readonly disableFatalDefects?: boolean | undefined; } | undefined): Effect.Effect<Effect.Effect<HttpServerResponse.HttpServerResponse, never, Scope.Scope | HttpServerRequest.HttpServerRequest>, never, Scope.Scope | RpcSerialization.RpcSerialization | Rpc.ToHandler<Rpcs> | Rpc.Middleware<Rpcs> | Rpc.ServicesServer<Rpcs>>`
- **Import guidance:** Start from `import { RpcServer } from "effect/unstable/rpc"` and use `RpcServer.toHttpEffectWebsocket`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `RpcServer.toHttpEffectWebsocket`, execute it explicitly, and assert its semantic success value or captured failure.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/rpc/RpcServer.make`

- **Source:** `packages/effect/src/unstable/rpc/RpcServer.ts:489`
- **Kind / category:** `root-declaration` / `server`
- **Priority:** **recommended**
- **Current description:** Runs an RPC server for a group using the current server `Protocol`, decoding requests, invoking handlers, encoding responses, and managing in-flight request lifetime.
- **Signature hint:** `declare function make<Rpcs extends Rpc.Any>(group: RpcGroup.RpcGroup<Rpcs>, options?: { readonly disableTracing?: boolean | undefined; readonly spanPrefix?: string | undefined; readonly spanAttributes?: Record<string, unknown> | undefined; readonly concurrency?: number | 'unbounded' | undefined; readonly disableFatalDefects?: boolean | undefined; } | undefined): Effect.Effect<never, never, Protocol | Rpc.ToHandler<Rpcs> | Rpc.Middleware<Rpcs> | Rpc.ServicesServer<Rpcs>>`
- **Import guidance:** Start from `import { RpcServer } from "effect/unstable/rpc"` and use `RpcServer.make`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `RpcServer.make`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Use `TestClock` or explicit synchronization rather than elapsed wall time.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `effect/unstable/rpc/RpcServer.RpcServer`

- **Source:** `packages/effect/src/unstable/rpc/RpcServer.ts:69`
- **Kind / category:** `root-declaration` / `server`
- **Priority:** **optional**
- **Current description:** The decoded RPC server boundary, accepting client messages for a client id and allowing that client to be disconnected.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/rpc/RpcServer.RpcServer`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/rpc/RpcServer.Protocol.make`

- **Source:** `packages/effect/src/unstable/rpc/RpcServer.ts:861`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Creates a server protocol service from the supplied RPC implementation.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/rpc/RpcServer.Protocol.make` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

## Discouraged

### `effect/unstable/rpc/RpcServer.layerHttp`

- **Source:** `packages/effect/src/unstable/rpc/RpcServer.ts:797`
- **Kind / category:** `root-declaration` / `protocols`
- **Priority:** **discouraged**
- **Current description:** Creates a RPC server that registers a HTTP route with a `HttpRouter`.
- **Signature hint:** `declare function layerHttp<Rpcs extends Rpc.Any>(options: { readonly group: RpcGroup.RpcGroup<Rpcs>; readonly path: HttpRouter.PathInput; readonly protocol?: 'http' | 'websocket' | undefined; readonly disableTracing?: boolean | undefined; readonly spanPrefix?: string | undefined; readonly spanAttributes?: Record<string, unknown> | undefined; readonly concurrency?: number | 'unbounded' | undefined; readonly disableFatalDefects?: boolean | undefined; }): Layer.Layer<never, never, RpcSerialization.RpcSerialization | HttpRouter.HttpRouter | Rpc.ToHandler<Rpcs> | Rpc.Middleware<Rpcs> | Rpc.ServicesServer<Rpcs>>`
- **Import guidance:** Start from `import { RpcServer } from "effect/unstable/rpc"` and use `RpcServer.layerHttp`.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `RpcServer.layerHttp` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/unstable/rpc/RpcServer.Protocol`

- **Source:** `packages/effect/src/unstable/rpc/RpcServer.ts:836`
- **Kind / category:** `root-declaration` / `protocols`
- **Priority:** **discouraged**
- **Current description:** Defines the service interface for an RPC server transport, responsible for receiving encoded client messages, sending encoded responses, tracking clients, and declaring transport capabilities.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { RpcServer } from "effect/unstable/rpc"` and use `RpcServer.Protocol`.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `RpcServer.Protocol` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/unstable/rpc/RpcServer.makeProtocolSocketServer`

- **Source:** `packages/effect/src/unstable/rpc/RpcServer.ts:871`
- **Kind / category:** `root-declaration` / `protocols`
- **Priority:** **discouraged**
- **Current description:** Creates a server `Protocol` backed by the current `SocketServer`, accepting socket connections and routing decoded RPC messages.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { RpcServer } from "effect/unstable/rpc"` and use `RpcServer.makeProtocolSocketServer`.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `RpcServer.makeProtocolSocketServer` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/unstable/rpc/RpcServer.layerProtocolSocketServer`

- **Source:** `packages/effect/src/unstable/rpc/RpcServer.ts:886`
- **Kind / category:** `root-declaration` / `protocols`
- **Priority:** **discouraged**
- **Current description:** RPC protocol that uses `SocketServer` for communication.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { RpcServer } from "effect/unstable/rpc"` and use `RpcServer.layerProtocolSocketServer`.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `RpcServer.layerProtocolSocketServer` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/unstable/rpc/RpcServer.makeProtocolWithHttpEffectWebsocket`

- **Source:** `packages/effect/src/unstable/rpc/RpcServer.ts:899`
- **Kind / category:** `root-declaration` / `protocols`
- **Priority:** **discouraged**
- **Current description:** Creates a websocket server `Protocol` together with an HTTP effect that upgrades the current request to a websocket and attaches it to the protocol.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { RpcServer } from "effect/unstable/rpc"` and use `RpcServer.makeProtocolWithHttpEffectWebsocket`.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `RpcServer.makeProtocolWithHttpEffectWebsocket` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/unstable/rpc/RpcServer.makeProtocolWebsocket`

- **Source:** `packages/effect/src/unstable/rpc/RpcServer.ts:934`
- **Kind / category:** `root-declaration` / `protocols`
- **Priority:** **discouraged**
- **Current description:** Creates a websocket server `Protocol` and registers its upgrade handler as a GET route on the current `HttpRouter`.
- **Signature hint:** `declare function makeProtocolWebsocket(options: { readonly path: HttpRouter.PathInput; }): Effect.Effect<Protocol['Service'], never, RpcSerialization.RpcSerialization | HttpRouter.HttpRouter>`
- **Import guidance:** Start from `import { RpcServer } from "effect/unstable/rpc"` and use `RpcServer.makeProtocolWebsocket`.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `RpcServer.makeProtocolWebsocket` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/unstable/rpc/RpcServer.layerProtocolWebsocket`

- **Source:** `packages/effect/src/unstable/rpc/RpcServer.ts:953`
- **Kind / category:** `root-declaration` / `protocols`
- **Priority:** **discouraged**
- **Current description:** RPC protocol that uses WebSockets for communication.
- **Signature hint:** `declare function layerProtocolWebsocket(options: { readonly path: HttpRouter.PathInput; }): Layer.Layer<Protocol, never, RpcSerialization.RpcSerialization | HttpRouter.HttpRouter>`
- **Import guidance:** Start from `import { RpcServer } from "effect/unstable/rpc"` and use `RpcServer.layerProtocolWebsocket`.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `RpcServer.layerProtocolWebsocket` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/unstable/rpc/RpcServer.makeProtocolWithHttpEffect`

- **Source:** `packages/effect/src/unstable/rpc/RpcServer.ts:971`
- **Kind / category:** `root-declaration` / `protocols`
- **Priority:** **discouraged**
- **Current description:** Creates an HTTP request/response server `Protocol` together with an HTTP effect that decodes the current request and streams or returns encoded RPC responses.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { RpcServer } from "effect/unstable/rpc"` and use `RpcServer.makeProtocolWithHttpEffect`.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `RpcServer.makeProtocolWithHttpEffect` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/unstable/rpc/RpcServer.makeProtocolHttp`

- **Source:** `packages/effect/src/unstable/rpc/RpcServer.ts:1138`
- **Kind / category:** `root-declaration` / `protocols`
- **Priority:** **discouraged**
- **Current description:** Creates an HTTP server `Protocol` and registers its request handler as a POST route on the current `HttpRouter`.
- **Signature hint:** `declare function makeProtocolHttp(options: { readonly path: HttpRouter.PathInput; }): Effect.Effect<Protocol['Service'], never, RpcSerialization.RpcSerialization | HttpRouter.HttpRouter>`
- **Import guidance:** Start from `import { RpcServer } from "effect/unstable/rpc"` and use `RpcServer.makeProtocolHttp`.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `RpcServer.makeProtocolHttp` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/unstable/rpc/RpcServer.layerProtocolHttp`

- **Source:** `packages/effect/src/unstable/rpc/RpcServer.ts:1158`
- **Kind / category:** `root-declaration` / `protocols`
- **Priority:** **discouraged**
- **Current description:** Provides a server `Protocol` that uses HTTP POST requests for RPC communication.
- **Signature hint:** `declare function layerProtocolHttp(options: { readonly path: HttpRouter.PathInput; }): Layer.Layer<Protocol, never, RpcSerialization.RpcSerialization | HttpRouter.HttpRouter>`
- **Import guidance:** Start from `import { RpcServer } from "effect/unstable/rpc"` and use `RpcServer.layerProtocolHttp`.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `RpcServer.layerProtocolHttp` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/unstable/rpc/RpcServer.makeProtocolStdio`

- **Source:** `packages/effect/src/unstable/rpc/RpcServer.ts:1253`
- **Kind / category:** `root-declaration` / `protocols`
- **Priority:** **discouraged**
- **Current description:** Creates a server `Protocol` that reads RPC messages from `Stdio.stdin` and writes encoded responses to `Stdio.stdout`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { RpcServer } from "effect/unstable/rpc"` and use `RpcServer.makeProtocolStdio`.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `RpcServer.makeProtocolStdio` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/unstable/rpc/RpcServer.layerProtocolStdio`

- **Source:** `packages/effect/src/unstable/rpc/RpcServer.ts:1314`
- **Kind / category:** `root-declaration` / `protocols`
- **Priority:** **discouraged**
- **Current description:** Provides a server `Protocol` that reads RPC messages from `Stdio.stdin` and writes encoded responses to `Stdio.stdout`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { RpcServer } from "effect/unstable/rpc"` and use `RpcServer.layerProtocolStdio`.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `RpcServer.layerProtocolStdio` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/unstable/rpc/RpcServer.makeProtocolWorkerRunner`

- **Source:** `packages/effect/src/unstable/rpc/RpcServer.ts:1327`
- **Kind / category:** `root-declaration` / `protocols`
- **Priority:** **discouraged**
- **Current description:** Creates a server `Protocol` backed by `WorkerRunnerPlatform`, routing worker messages to the RPC server and server responses back to workers.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { RpcServer } from "effect/unstable/rpc"` and use `RpcServer.makeProtocolWorkerRunner`.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `RpcServer.makeProtocolWorkerRunner` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/unstable/rpc/RpcServer.layerProtocolWorkerRunner`

- **Source:** `packages/effect/src/unstable/rpc/RpcServer.ts:1385`
- **Kind / category:** `root-declaration` / `protocols`
- **Priority:** **discouraged**
- **Current description:** Provides a server `Protocol` backed by the current `WorkerRunnerPlatform`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { RpcServer } from "effect/unstable/rpc"` and use `RpcServer.layerProtocolWorkerRunner`.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `RpcServer.layerProtocolWorkerRunner` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.
