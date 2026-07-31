# Example Suggestions: `effect/unstable/cluster/Entity`

- **Package:** `effect`
- **Source:** `packages/effect/src/unstable/cluster/Entity.ts`
- **Uncovered API records:** 29
- **Priorities:** 0 required, 5 recommended, 24 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                         | Line | Kind                    | Priority        |
| ----------------------------------------------------------- | ---: | ----------------------- | --------------- |
| `effect/unstable/cluster/Entity.makeTestClient`             |  597 | `root-declaration`      | **recommended** |
| `effect/unstable/cluster/Entity.CurrentAddress`             |  470 | `root-declaration`      | **recommended** |
| `effect/unstable/cluster/Entity.CurrentRunnerAddress`       |  486 | `root-declaration`      | **recommended** |
| `effect/unstable/cluster/Entity.keepAlive`                  |  705 | `root-declaration`      | **recommended** |
| `effect/unstable/cluster/Entity.KeepAliveLatch`             |  776 | `root-declaration`      | **recommended** |
| `effect/unstable/cluster/Entity.KeepAliveRpc`               |  761 | `root-declaration`      | **optional**    |
| `effect/unstable/cluster/Entity.isEntity`                   |  238 | `root-declaration`      | **optional**    |
| `effect/unstable/cluster/Entity.fromRpcGroup`               |  405 | `root-declaration`      | **optional**    |
| `effect/unstable/cluster/Entity.make`                       |  447 | `root-declaration`      | **optional**    |
| `effect/unstable/cluster/Entity.Replier (type)`             |  502 | `root-declaration`      | **optional**    |
| `effect/unstable/cluster/Entity.Request`                    |  557 | `root-declaration`      | **optional**    |
| `effect/unstable/cluster/Entity.Entity`                     |   66 | `root-declaration`      | **optional**    |
| `effect/unstable/cluster/Entity.Entity.type`                |   74 | `member`                | **optional**    |
| `effect/unstable/cluster/Entity.Entity.protocol`            |   80 | `member`                | **optional**    |
| `effect/unstable/cluster/Entity.Entity.getShardGroup`       |   85 | `member`                | **optional**    |
| `effect/unstable/cluster/Entity.Entity.getShardId`          |   90 | `member`                | **optional**    |
| `effect/unstable/cluster/Entity.Entity.annotate`            |   95 | `member`                | **optional**    |
| `effect/unstable/cluster/Entity.Entity.annotateRpcs`        |  100 | `member`                | **optional**    |
| `effect/unstable/cluster/Entity.Entity.annotateMerge`       |  105 | `member`                | **optional**    |
| `effect/unstable/cluster/Entity.Entity.annotateRpcsMerge`   |  110 | `member`                | **optional**    |
| `effect/unstable/cluster/Entity.Entity.client`              |  115 | `member`                | **optional**    |
| `effect/unstable/cluster/Entity.Entity.toLayer`             |  133 | `member`                | **optional**    |
| `effect/unstable/cluster/Entity.Entity.toLayerQueue`        |  166 | `member`                | **optional**    |
| `effect/unstable/cluster/Entity.Any`                        |  208 | `root-declaration`      | **optional**    |
| `effect/unstable/cluster/Entity.HandlersFrom`               |  222 | `root-declaration`      | **optional**    |
| `effect/unstable/cluster/Entity.Replier (type)`             |  529 | `namespace`             | **optional**    |
| `effect/unstable/cluster/Entity.Replier.Success`            |  541 | `namespace-declaration` | **optional**    |
| `effect/unstable/cluster/Entity.Request.lastSentChunkValue` |  567 | `member`                | **optional**    |
| `effect/unstable/cluster/Entity.Request.nextSequence`       |  576 | `member`                | **optional**    |

## Recommended

### `effect/unstable/cluster/Entity.makeTestClient`

- **Source:** `packages/effect/src/unstable/cluster/Entity.ts:597`
- **Kind / category:** `root-declaration` / `testing`
- **Priority:** **recommended**
- **Current description:** Builds an in-memory test client for an entity layer.
- **Signature hint:** `declare function makeTestClient<Type extends string, Rpcs extends Rpc.Any, LA, LE, LR>(entity: Entity<Type, Rpcs>, layer: Layer.Layer<LA, LE, LR>): Effect.Effect<(entityId: string) => Effect.Effect<RpcClient.RpcClient<Rpcs>>, LE, Scope | ShardingConfig | Exclude<LR, Sharding> | Rpc.MiddlewareClient<Rpcs>>`
- **Import guidance:** Start from `import { Entity } from "effect/unstable/cluster"` and use `Entity.makeTestClient`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `Entity.makeTestClient`, execute it explicitly, and assert its semantic success value or captured failure.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/cluster/Entity.CurrentAddress`

- **Source:** `packages/effect/src/unstable/cluster/Entity.ts:470`
- **Kind / category:** `root-declaration` / `context`
- **Priority:** **recommended**
- **Current description:** Service tag for the entity address currently being processed.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Entity } from "effect/unstable/cluster"` and use `Entity.CurrentAddress`.
- **Suggested snippet:** Consume `Entity.CurrentAddress` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/cluster/Entity.CurrentRunnerAddress`

- **Source:** `packages/effect/src/unstable/cluster/Entity.ts:486`
- **Kind / category:** `root-declaration` / `context`
- **Priority:** **recommended**
- **Current description:** Service tag for the runner address currently registering entity handlers.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Entity } from "effect/unstable/cluster"` and use `Entity.CurrentRunnerAddress`.
- **Suggested snippet:** Consume `Entity.CurrentRunnerAddress` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/cluster/Entity.keepAlive`

- **Source:** `packages/effect/src/unstable/cluster/Entity.ts:705`
- **Kind / category:** `root-declaration` / `Keep alive`
- **Priority:** **recommended**
- **Current description:** Enables or disables keep-alive for the current entity.
- **Signature hint:** `declare function keepAlive(enabled: boolean): Effect.Effect<void, never, Sharding | CurrentAddress>`
- **Import guidance:** Start from `import { Entity } from "effect/unstable/cluster"` and use `Entity.keepAlive`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `Entity.keepAlive`, execute it explicitly, and assert its semantic success value or captured failure.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/cluster/Entity.KeepAliveLatch`

- **Source:** `packages/effect/src/unstable/cluster/Entity.ts:776`
- **Kind / category:** `root-declaration` / `Keep alive`
- **Priority:** **recommended**
- **Current description:** Service tag for the latch that coordinates entity keep-alive state.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Entity } from "effect/unstable/cluster"` and use `Entity.KeepAliveLatch`.
- **Suggested snippet:** Consume `Entity.KeepAliveLatch` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `effect/unstable/cluster/Entity.KeepAliveRpc`

- **Source:** `packages/effect/src/unstable/cluster/Entity.ts:761`
- **Kind / category:** `root-declaration` / `Keep alive`
- **Priority:** **optional**
- **Current description:** RPC used internally to keep an entity active while a resource is held.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Entity } from "effect/unstable/cluster"` and use `Entity.KeepAliveRpc`.
- **Suggested snippet:** Use `Entity.KeepAliveRpc` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cluster/Entity.isEntity`

- **Source:** `packages/effect/src/unstable/cluster/Entity.ts:238`
- **Kind / category:** `root-declaration` / `refinements`
- **Priority:** **optional**
- **Current description:** Returns `true` when the supplied value is a cluster `Entity`.
- **Signature hint:** `declare function isEntity(u: unknown): u is Any`
- **Import guidance:** Start from `import { Entity } from "effect/unstable/cluster"` and use `Entity.isEntity`.
- **Suggested snippet:** Create one matching public value and one non-matching value accepted by the parameter type, call `Entity.isEntity` for both, and access a narrowed property in the true branch to demonstrate the type predicate.
- **Optional contrast:** Use one matching and one non-matching value from the accepted input domain.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cluster/Entity.fromRpcGroup`

- **Source:** `packages/effect/src/unstable/cluster/Entity.ts:405`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Creates a new `Entity` of the specified `type` which will accept messages that adhere to the provided `RpcGroup`.
- **Signature hint:** `declare function fromRpcGroup<const Type extends string, Rpcs extends Rpc.Any>(type: Type, protocol: RpcGroup.RpcGroup<Rpcs>): Entity<Type, Rpcs>`
- **Import guidance:** Start from `import { Entity } from "effect/unstable/cluster"` and use `Entity.fromRpcGroup`.
- **Suggested snippet:** Convert one representative external input with `Entity.fromRpcGroup` and assert the semantic output. Add one invalid or boundary input only when the return type models failure or absence.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cluster/Entity.make`

- **Source:** `packages/effect/src/unstable/cluster/Entity.ts:447`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Creates a new `Entity` of the specified `type` which will accept messages that adhere to the provided schemas.
- **Signature hint:** `declare function make<const Type extends string, Rpcs extends ReadonlyArray<Rpc.Any>>(type: Type, protocol: Rpcs): Entity<Type, Rpcs[number]>`
- **Import guidance:** Start from `import { Entity } from "effect/unstable/cluster"` and use `Entity.make`.
- **Suggested snippet:** Construct one representative value with `Entity.make`, then pass it to the smallest canonical getter, matcher, or runner that exposes what was created. Do not merely assert an object kind.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cluster/Entity.Replier (type)`

- **Source:** `packages/effect/src/unstable/cluster/Entity.ts:502`
- **Kind / category:** `root-declaration` / `Replier`
- **Priority:** **optional**
- **Current description:** Reply API passed to queue-based entity handlers.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/cluster/Entity.Replier`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cluster/Entity.Request`

- **Source:** `packages/effect/src/unstable/cluster/Entity.ts:557`
- **Kind / category:** `root-declaration` / `request`
- **Priority:** **optional**
- **Current description:** Represents an entity request envelope delivered to entity handlers.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Entity } from "effect/unstable/cluster"` and use `Entity.Request`.
- **Suggested snippet:** Use `Entity.Request` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cluster/Entity.Entity`

- **Source:** `packages/effect/src/unstable/cluster/Entity.ts:66`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Represents a cluster entity type and the RPC protocol it can handle.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/cluster/Entity.Entity`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cluster/Entity.Entity.type`

- **Source:** `packages/effect/src/unstable/cluster/Entity.ts:74`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The name of the entity type.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/cluster/Entity.Entity.type` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cluster/Entity.Entity.protocol`

- **Source:** `packages/effect/src/unstable/cluster/Entity.ts:80`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** A RpcGroup definition for messages which represents the messaging protocol that the entity is capable of processing.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/cluster/Entity.Entity.protocol` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cluster/Entity.Entity.getShardGroup`

- **Source:** `packages/effect/src/unstable/cluster/Entity.ts:85`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Get the shard group for the given EntityId.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/cluster/Entity.Entity.getShardGroup` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cluster/Entity.Entity.getShardId`

- **Source:** `packages/effect/src/unstable/cluster/Entity.ts:90`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Get the ShardId for the given EntityId.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/cluster/Entity.Entity.getShardId` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cluster/Entity.Entity.annotate`

- **Source:** `packages/effect/src/unstable/cluster/Entity.ts:95`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Annotate the entity with a value.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/cluster/Entity.Entity.annotate` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cluster/Entity.Entity.annotateRpcs`

- **Source:** `packages/effect/src/unstable/cluster/Entity.ts:100`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Annotate the Rpc's above this point with a value.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/cluster/Entity.Entity.annotateRpcs` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cluster/Entity.Entity.annotateMerge`

- **Source:** `packages/effect/src/unstable/cluster/Entity.ts:105`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Annotate the entity with the given annotations.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/cluster/Entity.Entity.annotateMerge` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cluster/Entity.Entity.annotateRpcsMerge`

- **Source:** `packages/effect/src/unstable/cluster/Entity.ts:110`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Annotate the Rpc's above this point with a context object.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/cluster/Entity.Entity.annotateRpcsMerge` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cluster/Entity.Entity.client`

- **Source:** `packages/effect/src/unstable/cluster/Entity.ts:115`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Create a client for this entity.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/cluster/Entity.Entity.client` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cluster/Entity.Entity.toLayer`

- **Source:** `packages/effect/src/unstable/cluster/Entity.ts:133`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Create a Layer from an Entity.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/cluster/Entity.Entity.toLayer` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cluster/Entity.Entity.toLayerQueue`

- **Source:** `packages/effect/src/unstable/cluster/Entity.ts:166`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Create a Layer from an Entity.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/cluster/Entity.Entity.toLayerQueue` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cluster/Entity.Any`

- **Source:** `packages/effect/src/unstable/cluster/Entity.ts:208`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Type alias for any cluster `Entity`, regardless of entity type or RPC protocol.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/cluster/Entity.Any`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cluster/Entity.HandlersFrom`

- **Source:** `packages/effect/src/unstable/cluster/Entity.ts:222`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Maps each RPC in an entity protocol to the handler function expected by `Entity.toLayer`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/cluster/Entity.HandlersFrom`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cluster/Entity.Replier (type)`

- **Source:** `packages/effect/src/unstable/cluster/Entity.ts:529`
- **Kind / category:** `namespace` / `none`
- **Priority:** **optional**
- **Current description:** Helper types used by the `Replier` API.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/cluster/Entity.Replier`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cluster/Entity.Replier.Success`

- **Source:** `packages/effect/src/unstable/cluster/Entity.ts:541`
- **Kind / category:** `namespace-declaration` / `Replier`
- **Priority:** **optional**
- **Current description:** Success value accepted by a `Replier` for a single RPC.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/cluster/Entity.Replier.Success`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cluster/Entity.Request.lastSentChunkValue`

- **Source:** `packages/effect/src/unstable/cluster/Entity.ts:567`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Most recent success chunk value sent by the entity, when one exists.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/cluster/Entity.Request.lastSentChunkValue` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Optional contrast:** Include the absent or empty input only when it teaches a distinct return value.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cluster/Entity.Request.nextSequence`

- **Source:** `packages/effect/src/unstable/cluster/Entity.ts:576`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Sequence number to use for the entity's next outgoing success chunk.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/cluster/Entity.Request.nextSequence` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.
