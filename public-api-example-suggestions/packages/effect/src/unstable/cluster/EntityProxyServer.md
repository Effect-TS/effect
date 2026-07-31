# Example Suggestions: `effect/unstable/cluster/EntityProxyServer`

- **Package:** `effect`
- **Source:** `packages/effect/src/unstable/cluster/EntityProxyServer.ts`
- **Uncovered API records:** 3
- **Priorities:** 0 required, 2 recommended, 1 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                          | Line | Kind               | Priority        |
| ------------------------------------------------------------ | ---: | ------------------ | --------------- |
| `effect/unstable/cluster/EntityProxyServer.layerHttpApi`     |   35 | `root-declaration` | **recommended** |
| `effect/unstable/cluster/EntityProxyServer.layerRpcHandlers` |  100 | `root-declaration` | **recommended** |
| `effect/unstable/cluster/EntityProxyServer.RpcHandlers`      |  139 | `root-declaration` | **optional**    |

## Recommended

### `effect/unstable/cluster/EntityProxyServer.layerHttpApi`

- **Source:** `packages/effect/src/unstable/cluster/EntityProxyServer.ts:35`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Creates HTTP API handlers for an entity proxy group.
- **Signature hint:** `declare function layerHttpApi<ApiId extends string, Groups extends HttpApiGroup.Constraint, Identifier extends HttpApiGroup.Identifier<Groups>, Type extends string, Rpcs extends Rpc.Any>(api: HttpApi.HttpApi<ApiId, Groups>, identifier: Identifier, entity: Entity.Entity<Type, Rpcs>): Layer.Layer<HttpApiGroup.Service<ApiId, Identifier>, never, Sharding | Rpc.ServicesServer<Rpcs>>`
- **Import guidance:** Start from `import { EntityProxyServer } from "effect/unstable/cluster"` and use `EntityProxyServer.layerHttpApi`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `EntityProxyServer.layerHttpApi`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/cluster/EntityProxyServer.layerRpcHandlers`

- **Source:** `packages/effect/src/unstable/cluster/EntityProxyServer.ts:100`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Creates RPC handlers for the group produced by `EntityProxy.toRpcGroup`.
- **Signature hint:** `declare function layerRpcHandlers<const Type extends string, Rpcs extends Rpc.Any>(entity: Entity.Entity<Type, Rpcs>): Layer.Layer<RpcHandlers<Rpcs, Type>, never, Sharding | Rpc.ServicesServer<Rpcs>>`
- **Import guidance:** Start from `import { EntityProxyServer } from "effect/unstable/cluster"` and use `EntityProxyServer.layerRpcHandlers`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `EntityProxyServer.layerRpcHandlers`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `effect/unstable/cluster/EntityProxyServer.RpcHandlers`

- **Source:** `packages/effect/src/unstable/cluster/EntityProxyServer.ts:139`
- **Kind / category:** `root-declaration` / `services`
- **Priority:** **optional**
- **Current description:** Union of RPC handler services required to serve the proxy RPCs for an entity.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/cluster/EntityProxyServer.RpcHandlers`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.
