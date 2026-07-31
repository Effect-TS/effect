# Example Suggestions: `effect/unstable/eventlog/EventLogServerUnencrypted`

- **Package:** `effect`
- **Source:** `packages/effect/src/unstable/eventlog/EventLogServerUnencrypted.ts`
- **Uncovered API records:** 16
- **Priorities:** 0 required, 12 recommended, 4 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                                              | Line | Kind               | Priority        |
| -------------------------------------------------------------------------------- | ---: | ------------------ | --------------- |
| `effect/unstable/eventlog/EventLogServerUnencrypted.layerStoreMappingStatic`     |  328 | `root-declaration` | **recommended** |
| `effect/unstable/eventlog/EventLogServerUnencrypted.layer`                       |  804 | `root-declaration` | **recommended** |
| `effect/unstable/eventlog/EventLogServerUnencrypted.layerNoRpcServer`            |  829 | `root-declaration` | **recommended** |
| `effect/unstable/eventlog/EventLogServerUnencrypted.EventLogServerUnencrypted`   |   57 | `root-declaration` | **recommended** |
| `effect/unstable/eventlog/EventLogServerUnencrypted.makeWrite`                   |   80 | `root-declaration` | **recommended** |
| `effect/unstable/eventlog/EventLogServerUnencrypted.EventLogServerStoreError`    |  235 | `root-declaration` | **recommended** |
| `effect/unstable/eventlog/EventLogServerUnencrypted.EventLogServerAuthError`     |  249 | `root-declaration` | **recommended** |
| `effect/unstable/eventlog/EventLogServerUnencrypted.EventLogServerAuthorization` |  268 | `root-declaration` | **recommended** |
| `effect/unstable/eventlog/EventLogServerUnencrypted.StoreMapping`                |  295 | `root-declaration` | **recommended** |
| `effect/unstable/eventlog/EventLogServerUnencrypted.Storage`                     |  358 | `root-declaration` | **recommended** |
| `effect/unstable/eventlog/EventLogServerUnencrypted.compactBacklog`              |  490 | `root-declaration` | **recommended** |
| `effect/unstable/eventlog/EventLogServerUnencrypted.make`                        |  698 | `root-declaration` | **recommended** |
| `effect/unstable/eventlog/EventLogServerUnencrypted.layerRpcHandlers`            |  110 | `root-declaration` | **optional**    |
| `effect/unstable/eventlog/EventLogServerUnencrypted.makeStorageMemory`           |  562 | `root-declaration` | **optional**    |
| `effect/unstable/eventlog/EventLogServerUnencrypted.layerStorageMemory`          |  669 | `root-declaration` | **optional**    |
| `effect/unstable/eventlog/EventLogServerUnencrypted.layerServer`                 |  766 | `root-declaration` | **optional**    |

## Recommended

### `effect/unstable/eventlog/EventLogServerUnencrypted.layerStoreMappingStatic`

- **Source:** `packages/effect/src/unstable/eventlog/EventLogServerUnencrypted.ts:328`
- **Kind / category:** `root-declaration` / `store`
- **Priority:** **recommended**
- **Current description:** Provides a `StoreMapping` that accepts only one configured store id and fails all other store ids as not found.
- **Signature hint:** `declare function layerStoreMappingStatic(options: { readonly storeId: StoreId; }): Layer.Layer<StoreMapping>`
- **Import guidance:** Start from `import { EventLogServerUnencrypted } from "effect/unstable/eventlog"` and use `EventLogServerUnencrypted.layerStoreMappingStatic`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `EventLogServerUnencrypted.layerStoreMappingStatic`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/eventlog/EventLogServerUnencrypted.layer`

- **Source:** `packages/effect/src/unstable/eventlog/EventLogServerUnencrypted.ts:804`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Builds a full unencrypted event-log RPC server for the supplied schema and event-group handler layer.
- **Signature hint:** `declare function layer<Groups extends EventGroup.Any, E, R>(_schema: EventLog.EventLogSchema<Groups>, layer: Layer.Layer<EventGroup.ToService<Groups>, E, R>): Layer.Layer<never, E, Exclude<R, EventLogServerUnencrypted | EventLog.Registry> | EventLogServerAuthorization | RpcServer.Protocol | Storage | StoreMapping>`
- **Import guidance:** Start from `import { EventLogServerUnencrypted } from "effect/unstable/eventlog"` and use `EventLogServerUnencrypted.layer`.
- **Suggested snippet:** Use the public setup or registry consumed by `EventLogServerUnencrypted.layer`, apply the layer, and assert the registration, migration, route, resource, or other side effect documented by nearby tests. The layer provides no service, so do not write an example that yields a service from context.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/eventlog/EventLogServerUnencrypted.layerNoRpcServer`

- **Source:** `packages/effect/src/unstable/eventlog/EventLogServerUnencrypted.ts:829`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Builds the unencrypted event-log server handlers without installing an `RpcServer.Protocol` implementation.
- **Signature hint:** `declare function layerNoRpcServer<Groups extends EventGroup.Any, E, R>(_schema: EventLog.EventLogSchema<Groups>, layer: Layer.Layer<EventGroup.ToService<Groups>, E, R>): Layer.Layer<Rpc.ToHandler<RpcGroup.Rpcs<typeof EventLogRemoteRpcs>> | EventLogAuthentication, E, Exclude<R, EventLogServerUnencrypted | EventLog.Registry> | EventLogServerAuthorization | Storage | StoreMapping>`
- **Import guidance:** Start from `import { EventLogServerUnencrypted } from "effect/unstable/eventlog"` and use `EventLogServerUnencrypted.layerNoRpcServer`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `EventLogServerUnencrypted.layerNoRpcServer`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/eventlog/EventLogServerUnencrypted.EventLogServerUnencrypted`

- **Source:** `packages/effect/src/unstable/eventlog/EventLogServerUnencrypted.ts:57`
- **Kind / category:** `root-declaration` / `services`
- **Priority:** **recommended**
- **Current description:** Service that writes plaintext event-log entries directly to unencrypted storage through registered event handlers.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { EventLogServerUnencrypted } from "effect/unstable/eventlog"` and use `EventLogServerUnencrypted.EventLogServerUnencrypted`.
- **Suggested snippet:** Consume `EventLogServerUnencrypted.EventLogServerUnencrypted` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/eventlog/EventLogServerUnencrypted.makeWrite`

- **Source:** `packages/effect/src/unstable/eventlog/EventLogServerUnencrypted.ts:80`
- **Kind / category:** `root-declaration` / `EventLogServerUnencrypted`
- **Priority:** **recommended**
- **Current description:** Creates a typed server-side write function for events in the supplied `EventLogSchema`.
- **Signature hint:** `declare function makeWrite<Groups extends EventGroup.Any>(schema: EventLog.EventLogSchema<Groups>): Effect.Effect<(<Tag extends EventGroup.Events<Groups>['tag'], Event extends Event.Any = Event.WithTag<EventGroup.Events<Groups>, Tag>>(options: { readonly storeId: StoreId; readonly event: Tag; readonly payload: Event.Payload<Event>; }) => Effect.Effect<Event.Success<Event>, EventLogServerStoreError | Event.Error<Event>>), never, EventLogServerUnencrypted>`
- **Import guidance:** Start from `import { EventLogServerUnencrypted } from "effect/unstable/eventlog"` and use `EventLogServerUnencrypted.makeWrite`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `EventLogServerUnencrypted.makeWrite`, execute it explicitly, and assert its semantic success value or captured failure.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/eventlog/EventLogServerUnencrypted.EventLogServerStoreError`

- **Source:** `packages/effect/src/unstable/eventlog/EventLogServerUnencrypted.ts:235`
- **Kind / category:** `root-declaration` / `errors`
- **Priority:** **recommended**
- **Current description:** Error raised by unencrypted server storage and store mapping operations.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { EventLogServerUnencrypted } from "effect/unstable/eventlog"` and use `EventLogServerUnencrypted.EventLogServerStoreError`.
- **Suggested snippet:** Create or capture `EventLogServerUnencrypted.EventLogServerStoreError` through the public operation that produces it, then assert its tag and one stable semantic field such as the input, path, or reason. Avoid stack traces and rendered message snapshots.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/eventlog/EventLogServerUnencrypted.EventLogServerAuthError`

- **Source:** `packages/effect/src/unstable/eventlog/EventLogServerUnencrypted.ts:249`
- **Kind / category:** `root-declaration` / `errors`
- **Priority:** **recommended**
- **Current description:** Error raised when unencrypted server authorization rejects an identity or store operation.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { EventLogServerUnencrypted } from "effect/unstable/eventlog"` and use `EventLogServerUnencrypted.EventLogServerAuthError`.
- **Suggested snippet:** Create or capture `EventLogServerUnencrypted.EventLogServerAuthError` through the public operation that produces it, then assert its tag and one stable semantic field such as the input, path, or reason. Avoid stack traces and rendered message snapshots.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/eventlog/EventLogServerUnencrypted.EventLogServerAuthorization`

- **Source:** `packages/effect/src/unstable/eventlog/EventLogServerUnencrypted.ts:268`
- **Kind / category:** `root-declaration` / `services`
- **Priority:** **recommended**
- **Current description:** Service that validates unencrypted event-log server write access, read access, and identities.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { EventLogServerUnencrypted } from "effect/unstable/eventlog"` and use `EventLogServerUnencrypted.EventLogServerAuthorization`.
- **Suggested snippet:** Consume `EventLogServerUnencrypted.EventLogServerAuthorization` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/eventlog/EventLogServerUnencrypted.StoreMapping`

- **Source:** `packages/effect/src/unstable/eventlog/EventLogServerUnencrypted.ts:295`
- **Kind / category:** `root-declaration` / `services`
- **Priority:** **recommended**
- **Current description:** Service that resolves client-requested store ids to server store ids and checks whether a store exists.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { EventLogServerUnencrypted } from "effect/unstable/eventlog"` and use `EventLogServerUnencrypted.StoreMapping`.
- **Suggested snippet:** Consume `EventLogServerUnencrypted.StoreMapping` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/eventlog/EventLogServerUnencrypted.Storage`

- **Source:** `packages/effect/src/unstable/eventlog/EventLogServerUnencrypted.ts:358`
- **Kind / category:** `root-declaration` / `storage`
- **Priority:** **recommended**
- **Current description:** Defines the backing store service used by the unencrypted event-log server.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { EventLogServerUnencrypted } from "effect/unstable/eventlog"` and use `EventLogServerUnencrypted.Storage`.
- **Suggested snippet:** Consume `EventLogServerUnencrypted.Storage` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/eventlog/EventLogServerUnencrypted.compactBacklog`

- **Source:** `packages/effect/src/unstable/eventlog/EventLogServerUnencrypted.ts:490`
- **Kind / category:** `root-declaration` / `compaction`
- **Priority:** **recommended**
- **Current description:** Runs the registered compactors over a backlog of remote entries.
- **Signature hint:** `declare function compactBacklog(options: { readonly remoteEntries: ReadonlyArray<RemoteEntry>; readonly compactors: ReadonlyMap<string, RegisteredCompactor>; }): Effect.Effect<readonly EventJournal.RemoteEntry[], never, never>`
- **Import guidance:** Start from `import { EventLogServerUnencrypted } from "effect/unstable/eventlog"` and use `EventLogServerUnencrypted.compactBacklog`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `EventLogServerUnencrypted.compactBacklog`, execute it explicitly, and assert its semantic success value or captured failure.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/eventlog/EventLogServerUnencrypted.make`

- **Source:** `packages/effect/src/unstable/eventlog/EventLogServerUnencrypted.ts:698`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Creates the `EventLogServerUnencrypted` service from the configured storage and registered event handlers.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { EventLogServerUnencrypted } from "effect/unstable/eventlog"` and use `EventLogServerUnencrypted.make`.
- **Suggested snippet:** Construct one representative value with `EventLogServerUnencrypted.make`, then pass it to the smallest canonical getter, matcher, or runner that exposes what was created. Do not merely assert an object kind.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `effect/unstable/eventlog/EventLogServerUnencrypted.layerRpcHandlers`

- **Source:** `packages/effect/src/unstable/eventlog/EventLogServerUnencrypted.ts:110`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **optional**
- **Current description:** Provides RPC handlers for the unencrypted event-log server.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { EventLogServerUnencrypted } from "effect/unstable/eventlog"` and use `EventLogServerUnencrypted.layerRpcHandlers`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `EventLogServerUnencrypted.layerRpcHandlers`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/eventlog/EventLogServerUnencrypted.makeStorageMemory`

- **Source:** `packages/effect/src/unstable/eventlog/EventLogServerUnencrypted.ts:562`
- **Kind / category:** `root-declaration` / `storage`
- **Priority:** **optional**
- **Current description:** Creates an in-memory unencrypted server `Storage`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { EventLogServerUnencrypted } from "effect/unstable/eventlog"` and use `EventLogServerUnencrypted.makeStorageMemory`.
- **Suggested snippet:** Construct one representative value with `EventLogServerUnencrypted.makeStorageMemory`, then pass it to the smallest canonical getter, matcher, or runner that exposes what was created. Do not merely assert an object kind.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/eventlog/EventLogServerUnencrypted.layerStorageMemory`

- **Source:** `packages/effect/src/unstable/eventlog/EventLogServerUnencrypted.ts:669`
- **Kind / category:** `root-declaration` / `storage`
- **Priority:** **optional**
- **Current description:** Provides unencrypted server `Storage` using the in-memory implementation.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { EventLogServerUnencrypted } from "effect/unstable/eventlog"` and use `EventLogServerUnencrypted.layerStorageMemory`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `EventLogServerUnencrypted.layerStorageMemory`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/eventlog/EventLogServerUnencrypted.layerServer`

- **Source:** `packages/effect/src/unstable/eventlog/EventLogServerUnencrypted.ts:766`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **optional**
- **Current description:** Provides `EventLogServerUnencrypted` and an event-log `Registry` using the configured unencrypted server `Storage`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { EventLogServerUnencrypted } from "effect/unstable/eventlog"` and use `EventLogServerUnencrypted.layerServer`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `EventLogServerUnencrypted.layerServer`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.
