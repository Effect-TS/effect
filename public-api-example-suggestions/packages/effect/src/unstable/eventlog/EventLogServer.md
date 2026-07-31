# Example Suggestions: `effect/unstable/eventlog/EventLogServer`

- **Package:** `effect`
- **Source:** `packages/effect/src/unstable/eventlog/EventLogServer.ts`
- **Uncovered API records:** 3
- **Priorities:** 0 required, 1 recommended, 2 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                           | Line | Kind               | Priority        |
| ------------------------------------------------------------- | ---: | ------------------ | --------------- |
| `effect/unstable/eventlog/EventLogServer.layerRpcHandlers`    |   76 | `root-declaration` | **recommended** |
| `effect/unstable/eventlog/EventLogServer.layerAuthMiddleware` |   49 | `root-declaration` | **optional**    |
| `effect/unstable/eventlog/EventLogServer.ChunkedMessageState` |  220 | `root-declaration` | **optional**    |

## Recommended

### `effect/unstable/eventlog/EventLogServer.layerRpcHandlers`

- **Source:** `packages/effect/src/unstable/eventlog/EventLogServer.ts:76`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Creates the shared RPC handlers for the event-log remote protocol.
- **Signature hint:** `declare function layerRpcHandlers(options: { readonly remoteId: RemoteId; readonly getOrCreateSessionAuthBinding: (publicKey: string, signingPublicKey: Uint8Array<ArrayBuffer>) => Effect.Effect<Uint8Array<ArrayBuffer>>; readonly onWrite: (data: Uint8Array<ArrayBuffer>) => Effect.Effect<void, EventLogProtocolError>; readonly changes: (options: { readonly publicKey: string; readonly storeId: StoreId; readonly startSequence: number; }) => Stream.Stream<Uint8Array<ArrayBuffer>, unknown>; }): Layer.Layer<Rpc.ToHandler<RpcGroup.Rpcs<typeof EventLogRemoteRpcs>> | EventLogAuthentication>`
- **Import guidance:** Start from `import { EventLogServer } from "effect/unstable/eventlog"` and use `EventLogServer.layerRpcHandlers`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `EventLogServer.layerRpcHandlers`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `effect/unstable/eventlog/EventLogServer.layerAuthMiddleware`

- **Source:** `packages/effect/src/unstable/eventlog/EventLogServer.ts:49`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **optional**
- **Current description:** Provides RPC authentication middleware that reads the authenticated `EventLog.Identity` from client annotations.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { EventLogServer } from "effect/unstable/eventlog"` and use `EventLogServer.layerAuthMiddleware`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `EventLogServer.layerAuthMiddleware`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/eventlog/EventLogServer.ChunkedMessageState`

- **Source:** `packages/effect/src/unstable/eventlog/EventLogServer.ts:220`
- **Kind / category:** `root-declaration` / `chunked message state`
- **Priority:** **optional**
- **Current description:** Annotation that stores partial `ChunkedMessage` data while chunked writes are being reassembled.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { EventLogServer } from "effect/unstable/eventlog"` and use `EventLogServer.ChunkedMessageState`.
- **Suggested snippet:** Consume `EventLogServer.ChunkedMessageState` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.
