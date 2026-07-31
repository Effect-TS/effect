# Example Suggestions: `effect/unstable/rpc/RpcWorker`

- **Package:** `effect`
- **Source:** `packages/effect/src/unstable/rpc/RpcWorker.ts`
- **Uncovered API records:** 6
- **Priorities:** 0 required, 4 recommended, 2 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                    | Line | Kind                    | Priority        |
| ------------------------------------------------------ | ---: | ----------------------- | --------------- |
| `effect/unstable/rpc/RpcWorker.layerInitialMessage`    |   92 | `root-declaration`      | **recommended** |
| `effect/unstable/rpc/RpcWorker.InitialMessage (value)` |   27 | `root-declaration`      | **recommended** |
| `effect/unstable/rpc/RpcWorker.makeInitialMessage`     |   67 | `root-declaration`      | **recommended** |
| `effect/unstable/rpc/RpcWorker.initialMessage`         |  111 | `root-declaration`      | **recommended** |
| `effect/unstable/rpc/RpcWorker.InitialMessage (type)`  |   42 | `namespace`             | **optional**    |
| `effect/unstable/rpc/RpcWorker.InitialMessage.Encoded` |   50 | `namespace-declaration` | **optional**    |

## Recommended

### `effect/unstable/rpc/RpcWorker.layerInitialMessage`

- **Source:** `packages/effect/src/unstable/rpc/RpcWorker.ts:92`
- **Kind / category:** `root-declaration` / `initial message`
- **Priority:** **recommended**
- **Current description:** Provides the `InitialMessage` service from a schema and build effect, capturing the layer context and dying if schema encoding fails.
- **Signature hint:** `declare function layerInitialMessage<S extends Schema.Constraint, R2>(schema: S, build: Effect.Effect<S['Type'], never, R2>): Layer.Layer<InitialMessage, never, S['EncodingServices'] | R2>`
- **Import guidance:** Start from `import { RpcWorker } from "effect/unstable/rpc"` and use `RpcWorker.layerInitialMessage`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `RpcWorker.layerInitialMessage`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/rpc/RpcWorker.InitialMessage (value)`

- **Source:** `packages/effect/src/unstable/rpc/RpcWorker.ts:27`
- **Kind / category:** `root-declaration` / `initial message`
- **Priority:** **recommended**
- **Current description:** Context service that supplies the initial RPC worker message as encoded data paired with any transferables that should be posted with it.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { RpcWorker } from "effect/unstable/rpc"` and use `RpcWorker.InitialMessage`.
- **Suggested snippet:** Consume `RpcWorker.InitialMessage` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/rpc/RpcWorker.makeInitialMessage`

- **Source:** `packages/effect/src/unstable/rpc/RpcWorker.ts:67`
- **Kind / category:** `root-declaration` / `initial message`
- **Priority:** **recommended**
- **Current description:** Runs an effect, encodes its result with the schema's JSON codec, and returns the encoded value together with collected transferables.
- **Signature hint:** `declare function makeInitialMessage<S extends Schema.Constraint, E, R2>(schema: S, effect: Effect.Effect<S['Type'], E, R2>): Effect.Effect<readonly [data: unknown, transferables: ReadonlyArray<globalThis.Transferable>], E | Schema.SchemaError, S['EncodingServices'] | R2>`
- **Import guidance:** Start from `import { RpcWorker } from "effect/unstable/rpc"` and use `RpcWorker.makeInitialMessage`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `RpcWorker.makeInitialMessage`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/rpc/RpcWorker.initialMessage`

- **Source:** `packages/effect/src/unstable/rpc/RpcWorker.ts:111`
- **Kind / category:** `root-declaration` / `initial message`
- **Priority:** **recommended**
- **Current description:** Reads the protocol initial message and decodes it with the supplied schema, failing if no initial message is available or decoding fails.
- **Signature hint:** `declare function initialMessage<S extends Schema.Constraint>(schema: S): Effect.Effect<S['Type'], NoSuchElementError | Schema.SchemaError, Protocol | S['DecodingServices']>`
- **Import guidance:** Start from `import { RpcWorker } from "effect/unstable/rpc"` and use `RpcWorker.initialMessage`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `RpcWorker.initialMessage`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `effect/unstable/rpc/RpcWorker.InitialMessage (type)`

- **Source:** `packages/effect/src/unstable/rpc/RpcWorker.ts:42`
- **Kind / category:** `namespace` / `none`
- **Priority:** **optional**
- **Current description:** Types related to the encoded initial message exchanged with an RPC worker.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/rpc/RpcWorker.InitialMessage`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/rpc/RpcWorker.InitialMessage.Encoded`

- **Source:** `packages/effect/src/unstable/rpc/RpcWorker.ts:50`
- **Kind / category:** `namespace-declaration` / `initial message`
- **Priority:** **optional**
- **Current description:** Tagged wire representation of an RPC worker initial message after schema encoding.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/rpc/RpcWorker.InitialMessage.Encoded`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.
