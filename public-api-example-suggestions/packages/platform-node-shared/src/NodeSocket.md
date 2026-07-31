# Example Suggestions: `@effect/platform-node-shared/NodeSocket`

- **Package:** `@effect/platform-node-shared`
- **Source:** `packages/platform-node-shared/src/NodeSocket.ts`
- **Uncovered API records:** 5
- **Priorities:** 0 required, 4 recommended, 1 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                      | Line | Kind               | Priority        |
| -------------------------------------------------------- | ---: | ------------------ | --------------- |
| `@effect/platform-node-shared/NodeSocket.fromDuplex`     |  108 | `root-declaration` | **recommended** |
| `@effect/platform-node-shared/NodeSocket.layerNet`       |  266 | `root-declaration` | **recommended** |
| `@effect/platform-node-shared/NodeSocket.NetSocket`      |   40 | `root-declaration` | **recommended** |
| `@effect/platform-node-shared/NodeSocket.makeNet`        |   59 | `root-declaration` | **recommended** |
| `@effect/platform-node-shared/NodeSocket.makeNetChannel` |  246 | `root-declaration` | **optional**    |

## Recommended

### `@effect/platform-node-shared/NodeSocket.fromDuplex`

- **Source:** `packages/platform-node-shared/src/NodeSocket.ts:108`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Adapts a Node `Duplex` into a `Socket.Socket`, wiring data events to socket handlers, providing a scoped writer, and mapping open, read, write, and close failures to `SocketError`.
- **Signature hint:** `declare function fromDuplex<RO>(open: Effect.Effect<Duplex, Socket.SocketError, RO>, options?: { readonly openTimeout?: Duration.Input | undefined; }): Effect.Effect<Socket.Socket, never, Exclude<RO, Scope.Scope>>`
- **Import guidance:** Start from `import { NodeSocket } from "@effect/platform-node-shared"` and use `NodeSocket.fromDuplex`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `NodeSocket.fromDuplex`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/platform-node-shared/NodeSocket.layerNet`

- **Source:** `packages/platform-node-shared/src/NodeSocket.ts:266`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Provides a `Socket.Socket` by opening a TCP connection with the supplied Node `net` connection options.
- **Signature hint:** `declare function layerNet(options: Net.NetConnectOpts): Layer.Layer<Socket.Socket, Socket.SocketError>`
- **Import guidance:** Start from `import { NodeSocket } from "@effect/platform-node-shared"` and use `NodeSocket.layerNet`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `NodeSocket.layerNet`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/platform-node-shared/NodeSocket.NetSocket`

- **Source:** `packages/platform-node-shared/src/NodeSocket.ts:40`
- **Kind / category:** `root-declaration` / `services`
- **Priority:** **recommended**
- **Current description:** Service tag for the underlying Node `net.Socket` associated with the current socket connection.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { NodeSocket } from "@effect/platform-node-shared"` and use `NodeSocket.NetSocket`.
- **Suggested snippet:** Consume `NodeSocket.NetSocket` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/platform-node-shared/NodeSocket.makeNet`

- **Source:** `packages/platform-node-shared/src/NodeSocket.ts:59`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Opens a Node TCP connection as an Effect socket.
- **Signature hint:** `declare function makeNet(options: Net.NetConnectOpts & { readonly openTimeout?: Duration.Input | undefined; }): Effect.Effect<Socket.Socket>`
- **Import guidance:** Start from `import { NodeSocket } from "@effect/platform-node-shared"` and use `NodeSocket.makeNet`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `NodeSocket.makeNet`, execute it explicitly, and assert its semantic success value or captured failure.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `@effect/platform-node-shared/NodeSocket.makeNetChannel`

- **Source:** `packages/platform-node-shared/src/NodeSocket.ts:246`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Creates a `Channel` over a TCP socket, reading arrays of `Uint8Array` chunks and writing arrays of bytes, strings, or socket close events.
- **Signature hint:** `declare function makeNetChannel<IE = never>(options: Net.NetConnectOpts): Channel.Channel<Array.NonEmptyReadonlyArray<Uint8Array>, Socket.SocketError | IE, void, Array.NonEmptyReadonlyArray<Uint8Array | string | Socket.CloseEvent>, IE>`
- **Import guidance:** Start from `import { NodeSocket } from "@effect/platform-node-shared"` and use `NodeSocket.makeNetChannel`.
- **Suggested snippet:** Create a finite Channel, apply `NodeSocket.makeNetChannel`, run it with the smallest compatible input, and assert its emitted values, done value, or failure without relying on internal channel state.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.
