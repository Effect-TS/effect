# Example Suggestions: `@effect/platform-node-shared/NodeSocketServer`

- **Package:** `@effect/platform-node-shared`
- **Source:** `packages/platform-node-shared/src/NodeSocketServer.ts`
- **Uncovered API records:** 5
- **Priorities:** 0 required, 5 recommended, 0 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                             | Line | Kind               | Priority        |
| --------------------------------------------------------------- | ---: | ------------------ | --------------- |
| `@effect/platform-node-shared/NodeSocketServer.make`            |   51 | `root-declaration` | **recommended** |
| `@effect/platform-node-shared/NodeSocketServer.layer`           |  169 | `root-declaration` | **recommended** |
| `@effect/platform-node-shared/NodeSocketServer.makeWebSocket`   |  184 | `root-declaration` | **recommended** |
| `@effect/platform-node-shared/NodeSocketServer.layerWebSocket`  |  287 | `root-declaration` | **recommended** |
| `@effect/platform-node-shared/NodeSocketServer.IncomingMessage` |   38 | `root-declaration` | **recommended** |

## Recommended

### `@effect/platform-node-shared/NodeSocketServer.make`

- **Source:** `packages/platform-node-shared/src/NodeSocketServer.ts:51`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Creates a scoped TCP `SocketServer` from a Node `net.Server`, starts listening with the supplied options, queues pending connections until `run` is called, and closes the server when the scope ends.
- **Signature hint:** `declare function make(options: Net.ServerOpts & Net.ListenOptions): Effect.Effect<{ readonly address: SocketServer.Address; readonly run: <R, E, _>(handler: (socket: Socket.Socket) => Effect.Effect<_, E, R>) => Effect.Effect<never, SocketServer.SocketServerError, R>; }, SocketServer.SocketServerError, Scope.Scope>`
- **Import guidance:** Start from `import { NodeSocketServer } from "@effect/platform-node-shared"` and use `NodeSocketServer.make`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `NodeSocketServer.make`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Record acquisition and release events and assert cleanup after the scope closes.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/platform-node-shared/NodeSocketServer.layer`

- **Source:** `packages/platform-node-shared/src/NodeSocketServer.ts:169`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Provides a TCP `SocketServer` by creating and managing a scoped Node `net.Server` with the supplied server and listen options.
- **Signature hint:** `declare function layer(options: Net.ServerOpts & Net.ListenOptions): Layer.Layer<SocketServer.SocketServer, SocketServer.SocketServerError>`
- **Import guidance:** Start from `import { NodeSocketServer } from "@effect/platform-node-shared"` and use `NodeSocketServer.layer`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `NodeSocketServer.layer`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Optional contrast:** Record acquisition and release events and assert cleanup after the scope closes.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/platform-node-shared/NodeSocketServer.makeWebSocket`

- **Source:** `packages/platform-node-shared/src/NodeSocketServer.ts:184`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Creates a scoped WebSocket `SocketServer` backed by the `ws` package, providing the WebSocket and its Node `IncomingMessage` to connection handlers and closing the server when the scope ends.
- **Signature hint:** `declare function makeWebSocket(options: NodeWS.ServerOptions<typeof NodeWS.WebSocket, typeof Http.IncomingMessage>): Effect.Effect<SocketServer.SocketServer['Service'], SocketServer.SocketServerError, Scope.Scope>`
- **Import guidance:** Start from `import { NodeSocketServer } from "@effect/platform-node-shared"` and use `NodeSocketServer.makeWebSocket`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `NodeSocketServer.makeWebSocket`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Record acquisition and release events and assert cleanup after the scope closes.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/platform-node-shared/NodeSocketServer.layerWebSocket`

- **Source:** `packages/platform-node-shared/src/NodeSocketServer.ts:287`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Provides a WebSocket `SocketServer` backed by the `ws` package and managed with the supplied server options.
- **Signature hint:** `declare function layerWebSocket(options: NodeSocket.NodeWS.ServerOptions<typeof NodeSocket.NodeWS.WebSocket, typeof Http.IncomingMessage>): Layer.Layer<SocketServer.SocketServer, SocketServer.SocketServerError>`
- **Import guidance:** Start from `import { NodeSocketServer } from "@effect/platform-node-shared"` and use `NodeSocketServer.layerWebSocket`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `NodeSocketServer.layerWebSocket`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/platform-node-shared/NodeSocketServer.IncomingMessage`

- **Source:** `packages/platform-node-shared/src/NodeSocketServer.ts:38`
- **Kind / category:** `root-declaration` / `services`
- **Priority:** **recommended**
- **Current description:** Service tag for the Node `IncomingMessage` associated with the current WebSocket server connection.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { NodeSocketServer } from "@effect/platform-node-shared"` and use `NodeSocketServer.IncomingMessage`.
- **Suggested snippet:** Consume `NodeSocketServer.IncomingMessage` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.
