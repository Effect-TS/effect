# Example Suggestions: `@effect/platform-deno/DenoSocketServer`

- **Package:** `@effect/platform-deno`
- **Source:** `packages/platform-deno/src/DenoSocketServer.ts`
- **Uncovered API records:** 6
- **Priorities:** 0 required, 4 recommended, 2 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                       | Line | Kind               | Priority        |
| --------------------------------------------------------- | ---: | ------------------ | --------------- |
| `@effect/platform-deno/DenoSocketServer.make`             |   51 | `root-declaration` | **recommended** |
| `@effect/platform-deno/DenoSocketServer.layer`            |   74 | `root-declaration` | **recommended** |
| `@effect/platform-deno/DenoSocketServer.makeTls`          |   87 | `root-declaration` | **recommended** |
| `@effect/platform-deno/DenoSocketServer.layerTls`         |  110 | `root-declaration` | **recommended** |
| `@effect/platform-deno/DenoSocketServer.ListenOptions`    |   33 | `root-declaration` | **optional**    |
| `@effect/platform-deno/DenoSocketServer.TlsListenOptions` |   43 | `root-declaration` | **optional**    |

## Recommended

### `@effect/platform-deno/DenoSocketServer.make`

- **Source:** `packages/platform-deno/src/DenoSocketServer.ts:51`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Creates a scoped socket server using a native Deno TCP or Unix listener.
- **Signature hint:** `declare function make(options: ListenOptions): Effect.Effect<SocketServer.SocketServer['Service'], SocketServer.SocketServerError, Scope.Scope>`
- **Import guidance:** Start from `import { DenoSocketServer } from "@effect/platform-deno"` and use `DenoSocketServer.make`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `DenoSocketServer.make`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Record acquisition and release events and assert cleanup after the scope closes.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/platform-deno/DenoSocketServer.layer`

- **Source:** `packages/platform-deno/src/DenoSocketServer.ts:74`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Provides a socket server using a scoped native Deno TCP or Unix listener.
- **Signature hint:** `declare function layer(options: ListenOptions): Layer.Layer<SocketServer.SocketServer, SocketServer.SocketServerError>`
- **Import guidance:** Start from `import { DenoSocketServer } from "@effect/platform-deno"` and use `DenoSocketServer.layer`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `DenoSocketServer.layer`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Optional contrast:** Record acquisition and release events and assert cleanup after the scope closes.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/platform-deno/DenoSocketServer.makeTls`

- **Source:** `packages/platform-deno/src/DenoSocketServer.ts:87`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Creates a scoped TLS socket server using a native Deno TLS listener.
- **Signature hint:** `declare function makeTls(options: TlsListenOptions): Effect.Effect<SocketServer.SocketServer['Service'], SocketServer.SocketServerError, Scope.Scope>`
- **Import guidance:** Start from `import { DenoSocketServer } from "@effect/platform-deno"` and use `DenoSocketServer.makeTls`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `DenoSocketServer.makeTls`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Record acquisition and release events and assert cleanup after the scope closes.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/platform-deno/DenoSocketServer.layerTls`

- **Source:** `packages/platform-deno/src/DenoSocketServer.ts:110`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Provides a TLS socket server using a scoped native Deno TLS listener.
- **Signature hint:** `declare function layerTls(options: TlsListenOptions): Layer.Layer<SocketServer.SocketServer, SocketServer.SocketServerError>`
- **Import guidance:** Start from `import { DenoSocketServer } from "@effect/platform-deno"` and use `DenoSocketServer.layerTls`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `DenoSocketServer.layerTls`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Optional contrast:** Record acquisition and release events and assert cleanup after the scope closes.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `@effect/platform-deno/DenoSocketServer.ListenOptions`

- **Source:** `packages/platform-deno/src/DenoSocketServer.ts:33`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Native Deno options for listening on a TCP or Unix socket.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/platform-deno/DenoSocketServer.ListenOptions`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/platform-deno/DenoSocketServer.TlsListenOptions`

- **Source:** `packages/platform-deno/src/DenoSocketServer.ts:43`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Native Deno options and certified key material for listening with TLS.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `@effect/platform-deno/DenoSocketServer.TlsListenOptions`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.
