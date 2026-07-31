# Example Suggestions: `effect/unstable/cluster/Runners`

- **Package:** `effect`
- **Source:** `packages/effect/src/unstable/cluster/Runners.ts`
- **Uncovered API records:** 10
- **Priorities:** 0 required, 8 recommended, 2 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                 | Line | Kind               | Priority        |
| --------------------------------------------------- | ---: | ------------------ | --------------- |
| `effect/unstable/cluster/Runners.make`              |  159 | `root-declaration` | **recommended** |
| `effect/unstable/cluster/Runners.layerNoop`         |  449 | `root-declaration` | **recommended** |
| `effect/unstable/cluster/Runners.layerRpc`          |  683 | `root-declaration` | **recommended** |
| `effect/unstable/cluster/Runners.Runners`           |   47 | `root-declaration` | **recommended** |
| `effect/unstable/cluster/Runners.makeNoop`          |  431 | `root-declaration` | **recommended** |
| `effect/unstable/cluster/Runners.Rpcs`              |  472 | `root-declaration` | **recommended** |
| `effect/unstable/cluster/Runners.makeRpc`           |  536 | `root-declaration` | **recommended** |
| `effect/unstable/cluster/Runners.RpcClientProtocol` |  698 | `root-declaration` | **recommended** |
| `effect/unstable/cluster/Runners.RpcClient`         |  513 | `root-declaration` | **optional**    |
| `effect/unstable/cluster/Runners.makeRpcClient`     |  522 | `root-declaration` | **optional**    |

## Recommended

### `effect/unstable/cluster/Runners.make`

- **Source:** `packages/effect/src/unstable/cluster/Runners.ts:159`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Builds the `Runners` service from remote runner callbacks and adds local message persistence, duplicate request handling, optional local serialization simulation, and polling for persisted replies.
- **Signature hint:** `declare function make(options: Omit<Runners['Service'], 'sendLocal' | 'notifyLocal'>): Effect.Effect<Runners['Service'], never, MessageStorage.MessageStorage | Snowflake.Generator | ShardingConfig | Scope>`
- **Import guidance:** Start from `import { Runners } from "effect/unstable/cluster"` and use `Runners.make`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `Runners.make`, execute it explicitly, and assert its semantic success value or captured failure.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/cluster/Runners.layerNoop`

- **Source:** `packages/effect/src/unstable/cluster/Runners.ts:449`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Layer that provides the no-op `Runners` service, using the default snowflake generator.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Runners } from "effect/unstable/cluster"` and use `Runners.layerNoop`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `Runners.layerNoop`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/cluster/Runners.layerRpc`

- **Source:** `packages/effect/src/unstable/cluster/Runners.ts:683`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Layer that provides an RPC-backed `Runners` service using `RpcClientProtocol`, message storage, sharding configuration, and the default snowflake generator.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Runners } from "effect/unstable/cluster"` and use `Runners.layerRpc`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `Runners.layerRpc`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/cluster/Runners.Runners`

- **Source:** `packages/effect/src/unstable/cluster/Runners.ts:47`
- **Kind / category:** `root-declaration` / `context`
- **Priority:** **recommended**
- **Current description:** Service for communicating with cluster runners, including pinging runners, sending and notifying messages, coordinating persisted replies, and marking runners unavailable.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Runners } from "effect/unstable/cluster"` and use `Runners.Runners`.
- **Suggested snippet:** Consume `Runners.Runners` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/cluster/Runners.makeNoop`

- **Source:** `packages/effect/src/unstable/cluster/Runners.ts:431`
- **Kind / category:** `root-declaration` / `No-op`
- **Priority:** **recommended**
- **Current description:** Creates a no-op `Runners` service that rejects sends with `EntityNotAssignedToRunner` and ignores notifications, pings, and unavailable runner reports.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Runners } from "effect/unstable/cluster"` and use `Runners.makeNoop`.
- **Suggested snippet:** Construct one representative value with `Runners.makeNoop`, then pass it to the smallest canonical getter, matcher, or runner that exposes what was created. Do not merely assert an object kind.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/cluster/Runners.Rpcs`

- **Source:** `packages/effect/src/unstable/cluster/Runners.ts:472`
- **Kind / category:** `root-declaration` / `Rpcs`
- **Priority:** **recommended**
- **Current description:** RPC group used for runner-to-runner communication, including ping, notify, effect, stream, and envelope messages.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Runners } from "effect/unstable/cluster"` and use `Runners.Rpcs`.
- **Suggested snippet:** Use `Runners.Rpcs` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/cluster/Runners.makeRpc`

- **Source:** `packages/effect/src/unstable/cluster/Runners.ts:536`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Builds a `Runners` service backed by RPC clients, caching a client per runner address and dispatching ping, notify, effect, stream, and envelope messages over the runner protocol.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Runners } from "effect/unstable/cluster"` and use `Runners.makeRpc`.
- **Suggested snippet:** Construct one representative value with `Runners.makeRpc`, then pass it to the smallest canonical getter, matcher, or runner that exposes what was created. Do not merely assert an object kind.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/cluster/Runners.RpcClientProtocol`

- **Source:** `packages/effect/src/unstable/cluster/Runners.ts:698`
- **Kind / category:** `root-declaration` / `client`
- **Priority:** **recommended**
- **Current description:** Service that creates an RPC client protocol for communicating with a runner at a given address.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Runners } from "effect/unstable/cluster"` and use `Runners.RpcClientProtocol`.
- **Suggested snippet:** Consume `Runners.RpcClientProtocol` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `effect/unstable/cluster/Runners.RpcClient`

- **Source:** `packages/effect/src/unstable/cluster/Runners.ts:513`
- **Kind / category:** `root-declaration` / `Rpcs`
- **Priority:** **optional**
- **Current description:** Client interface generated from the runner RPC group.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/cluster/Runners.RpcClient`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cluster/Runners.makeRpcClient`

- **Source:** `packages/effect/src/unstable/cluster/Runners.ts:522`
- **Kind / category:** `root-declaration` / `Rpcs`
- **Priority:** **optional**
- **Current description:** Builds a runner RPC client from the current `RpcClient.Protocol`, using the `Runners` span prefix with tracing disabled.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Runners } from "effect/unstable/cluster"` and use `Runners.makeRpcClient`.
- **Suggested snippet:** Construct one representative value with `Runners.makeRpcClient`, then pass it to the smallest canonical getter, matcher, or runner that exposes what was created. Do not merely assert an object kind.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.
