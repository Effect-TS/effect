# Example Suggestions: `effect/unstable/eventlog/EventLogRemote`

- **Package:** `effect`
- **Source:** `packages/effect/src/unstable/eventlog/EventLogRemote.ts`
- **Uncovered API records:** 8
- **Priorities:** 0 required, 5 recommended, 3 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                            | Line | Kind               | Priority        |
| -------------------------------------------------------------- | ---: | ------------------ | --------------- |
| `effect/unstable/eventlog/EventLogRemote.makeWith`             |  152 | `root-declaration` | **recommended** |
| `effect/unstable/eventlog/EventLogRemote.layerEncrypted`       |  356 | `root-declaration` | **recommended** |
| `effect/unstable/eventlog/EventLogRemote.EventLogRemote`       |   59 | `root-declaration` | **recommended** |
| `effect/unstable/eventlog/EventLogRemote.EventLogRemoteError`  |   83 | `root-declaration` | **recommended** |
| `effect/unstable/eventlog/EventLogRemote.EventLogRemoteClient` |  125 | `root-declaration` | **recommended** |
| `effect/unstable/eventlog/EventLogRemote.makeEncrypted`        |  300 | `root-declaration` | **optional**    |
| `effect/unstable/eventlog/EventLogRemote.makeUnencrypted`      |  335 | `root-declaration` | **optional**    |
| `effect/unstable/eventlog/EventLogRemote.layerUnencrypted`     |  371 | `root-declaration` | **optional**    |

## Recommended

### `effect/unstable/eventlog/EventLogRemote.makeWith`

- **Source:** `packages/effect/src/unstable/eventlog/EventLogRemote.ts:152`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Creates an `EventLogRemote` from custom write encoding and change decoding functions.
- **Signature hint:** `declare function makeWith(args_0: { readonly encodeWrite: (options: { readonly identity: Identity['Service']; readonly entries: ReadonlyArray<Entry>; readonly storeId: StoreId; }) => Effect.Effect<Uint8Array<ArrayBuffer>, Schema.SchemaError>; readonly decodeChanges: (identity: Identity['Service'], data: Uint8Array<ArrayBuffer>) => Effect.Effect<ReadonlyArray<RemoteEntry>, Schema.SchemaError>; }): Effect.Effect<{ readonly id: RemoteId; readonly changes: (options: { readonly identity: Identity['Service']; readonly storeId: StoreId; readonly startSequence: number; }) => Effect.Effect<Queue.Dequeue<RemoteEntry, EventLogRemoteError>, never, Scope.Scope>; readonly write: (options: { readonly identity: Identity['Service']; readonly storeId: StoreId; readonly entries: ReadonlyArray<Entry>; }) => Effect.Effect<void, EventLogRemoteError>; readonly whenAuthenticated: <A, E, R>(effect: Effect.Effect<A, E, R>) => Effect.Effect<A, E | EventLogRemoteError, R | Identity>; }, EventLogRemoteError, Scope.Scope | Registry | EventLogRemoteClient>`
- **Import guidance:** Start from `import { EventLogRemote } from "effect/unstable/eventlog"` and use `EventLogRemote.makeWith`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `EventLogRemote.makeWith`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/eventlog/EventLogRemote.layerEncrypted`

- **Source:** `packages/effect/src/unstable/eventlog/EventLogRemote.ts:356`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Provides an encrypted `EventLogRemote` using the remote RPC client and the default Web Crypto encryption layer.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { EventLogRemote } from "effect/unstable/eventlog"` and use `EventLogRemote.layerEncrypted`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `EventLogRemote.layerEncrypted`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/eventlog/EventLogRemote.EventLogRemote`

- **Source:** `packages/effect/src/unstable/eventlog/EventLogRemote.ts:59`
- **Kind / category:** `root-declaration` / `services`
- **Priority:** **recommended**
- **Current description:** Service that represents a remote event-log replica.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { EventLogRemote } from "effect/unstable/eventlog"` and use `EventLogRemote.EventLogRemote`.
- **Suggested snippet:** Consume `EventLogRemote.EventLogRemote` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/eventlog/EventLogRemote.EventLogRemoteError`

- **Source:** `packages/effect/src/unstable/eventlog/EventLogRemote.ts:83`
- **Kind / category:** `root-declaration` / `errors`
- **Priority:** **recommended**
- **Current description:** Error raised by `EventLogRemote` operations, recording the failed method and underlying cause.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { EventLogRemote } from "effect/unstable/eventlog"` and use `EventLogRemote.EventLogRemoteError`.
- **Suggested snippet:** Create or capture `EventLogRemote.EventLogRemoteError` through the public operation that produces it, then assert its tag and one stable semantic field such as the input, path, or reason. Avoid stack traces and rendered message snapshots.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/eventlog/EventLogRemote.EventLogRemoteClient`

- **Source:** `packages/effect/src/unstable/eventlog/EventLogRemote.ts:125`
- **Kind / category:** `root-declaration` / `RPC client`
- **Priority:** **recommended**
- **Current description:** Service that provides a typed RPC client for the `EventLogRemoteRpcs` protocol.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { EventLogRemote } from "effect/unstable/eventlog"` and use `EventLogRemote.EventLogRemoteClient`.
- **Suggested snippet:** Consume `EventLogRemote.EventLogRemoteClient` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `effect/unstable/eventlog/EventLogRemote.makeEncrypted`

- **Source:** `packages/effect/src/unstable/eventlog/EventLogRemote.ts:300`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Creates an `EventLogRemote` that encrypts outgoing entries and decrypts incoming changes with `EventLogEncryption`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { EventLogRemote } from "effect/unstable/eventlog"` and use `EventLogRemote.makeEncrypted`.
- **Suggested snippet:** Construct one representative value with `EventLogRemote.makeEncrypted`, then pass it to the smallest canonical getter, matcher, or runner that exposes what was created. Do not merely assert an object kind.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/eventlog/EventLogRemote.makeUnencrypted`

- **Source:** `packages/effect/src/unstable/eventlog/EventLogRemote.ts:335`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Creates an `EventLogRemote` that sends and receives plaintext entry payloads.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { EventLogRemote } from "effect/unstable/eventlog"` and use `EventLogRemote.makeUnencrypted`.
- **Suggested snippet:** Construct one representative value with `EventLogRemote.makeUnencrypted`, then pass it to the smallest canonical getter, matcher, or runner that exposes what was created. Do not merely assert an object kind.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/eventlog/EventLogRemote.layerUnencrypted`

- **Source:** `packages/effect/src/unstable/eventlog/EventLogRemote.ts:371`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **optional**
- **Current description:** Provides an unencrypted `EventLogRemote` using the remote RPC client.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { EventLogRemote } from "effect/unstable/eventlog"` and use `EventLogRemote.layerUnencrypted`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `EventLogRemote.layerUnencrypted`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.
