# Example Suggestions: `@effect/platform-deno/DenoSocket`

- **Package:** `@effect/platform-deno`
- **Source:** `packages/platform-deno/src/DenoSocket.ts`
- **Uncovered API records:** 9
- **Priorities:** 0 required, 5 recommended, 4 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                          | Line | Kind               | Priority        |
| ------------------------------------------------------------ | ---: | ------------------ | --------------- |
| `@effect/platform-deno/DenoSocket.fromConn`                  |   62 | `root-declaration` | **recommended** |
| `@effect/platform-deno/DenoSocket.layerTcp`                  |  277 | `root-declaration` | **recommended** |
| `@effect/platform-deno/DenoSocket.layerWebSocket`            |  288 | `root-declaration` | **recommended** |
| `@effect/platform-deno/DenoSocket.Conn`                      |   52 | `root-declaration` | **recommended** |
| `@effect/platform-deno/DenoSocket.makeTcp`                   |  200 | `root-declaration` | **recommended** |
| `@effect/platform-deno/DenoSocket.makeTcpChannel`            |  261 | `root-declaration` | **optional**    |
| `@effect/platform-deno/DenoSocket.layerWebSocketConstructor` |  301 | `root-declaration` | **optional**    |
| `@effect/platform-deno/DenoSocket.ConnectOptions`            |   31 | `root-declaration` | **optional**    |
| `@effect/platform-deno/DenoSocket.TcpOptions`                |   42 | `root-declaration` | **optional**    |

## Recommended

### `@effect/platform-deno/DenoSocket.fromConn`

- **Source:** `packages/platform-deno/src/DenoSocket.ts:62`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Adapts a Deno connection into an Effect socket.
- **Signature hint:** `declare function fromConn<RO>(open: Effect.Effect<Deno.Conn, Socket.SocketError, RO>): Effect.Effect<Socket.Socket, never, Exclude<RO, Scope.Scope>>`
- **Import guidance:** Start from `import { DenoSocket } from "@effect/platform-deno"` and use `DenoSocket.fromConn`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `DenoSocket.fromConn`, execute it explicitly, and assert its semantic success value or captured failure.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/platform-deno/DenoSocket.layerTcp`

- **Source:** `packages/platform-deno/src/DenoSocket.ts:277`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Provides a socket by opening a native Deno TCP or Unix connection.
- **Signature hint:** `declare function layerTcp(options: ConnectOptions): Layer.Layer<Socket.Socket, Socket.SocketError>`
- **Import guidance:** Start from `import { DenoSocket } from "@effect/platform-deno"` and use `DenoSocket.layerTcp`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `DenoSocket.layerTcp`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/platform-deno/DenoSocket.layerWebSocket`

- **Source:** `packages/platform-deno/src/DenoSocket.ts:288`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Creates a socket layer connected to a URL with Deno's global WebSocket.
- **Signature hint:** `declare function layerWebSocket(url: string, options?: { readonly closeCodeIsError?: (code: number) => boolean; }): Layer.Layer<Socket.Socket>`
- **Import guidance:** Start from `import { DenoSocket } from "@effect/platform-deno"` and use `DenoSocket.layerWebSocket`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `DenoSocket.layerWebSocket`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/platform-deno/DenoSocket.Conn`

- **Source:** `packages/platform-deno/src/DenoSocket.ts:52`
- **Kind / category:** `root-declaration` / `services`
- **Priority:** **recommended**
- **Current description:** Service tag for the underlying Deno connection.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { DenoSocket } from "@effect/platform-deno"` and use `DenoSocket.Conn`.
- **Suggested snippet:** Consume `DenoSocket.Conn` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/platform-deno/DenoSocket.makeTcp`

- **Source:** `packages/platform-deno/src/DenoSocket.ts:200`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Opens a native Deno TCP or Unix connection as an Effect socket.
- **Signature hint:** `declare function makeTcp(options: TcpOptions): Effect.Effect<Socket.Socket>`
- **Import guidance:** Start from `import { DenoSocket } from "@effect/platform-deno"` and use `DenoSocket.makeTcp`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `DenoSocket.makeTcp`, execute it explicitly, and assert its semantic success value or captured failure.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `@effect/platform-deno/DenoSocket.makeTcpChannel`

- **Source:** `packages/platform-deno/src/DenoSocket.ts:261`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Creates a channel over a native Deno TCP or Unix connection.
- **Signature hint:** `declare function makeTcpChannel<IE = never>(options: ConnectOptions): Channel.Channel<Array.NonEmptyReadonlyArray<Uint8Array>, Socket.SocketError | IE, void, Array.NonEmptyReadonlyArray<Uint8Array | string | Socket.CloseEvent>, IE>`
- **Import guidance:** Start from `import { DenoSocket } from "@effect/platform-deno"` and use `DenoSocket.makeTcpChannel`.
- **Suggested snippet:** Create a finite Channel, apply `DenoSocket.makeTcpChannel`, run it with the smallest compatible input, and assert its emitted values, done value, or failure without relying on internal channel state.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/platform-deno/DenoSocket.layerWebSocketConstructor`

- **Source:** `packages/platform-deno/src/DenoSocket.ts:301`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **optional**
- **Current description:** Provides the WebSocket constructor backed by `globalThis.WebSocket`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { DenoSocket } from "@effect/platform-deno"` and use `DenoSocket.layerWebSocketConstructor`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `DenoSocket.layerWebSocketConstructor`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/platform-deno/DenoSocket.ConnectOptions`

- **Source:** `packages/platform-deno/src/DenoSocket.ts:31`
- **Kind / category:** `root-declaration` / `types`
- **Priority:** **optional**
- **Current description:** Options for opening a TCP or Unix connection.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/platform-deno/DenoSocket.ConnectOptions`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/platform-deno/DenoSocket.TcpOptions`

- **Source:** `packages/platform-deno/src/DenoSocket.ts:42`
- **Kind / category:** `root-declaration` / `types`
- **Priority:** **optional**
- **Current description:** Options for opening a TCP or Unix connection.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/platform-deno/DenoSocket.TcpOptions`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.
