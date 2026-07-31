# Example Suggestions: `@effect/platform-node-shared/NodeClusterSocket`

- **Package:** `@effect/platform-node-shared`
- **Source:** `packages/platform-node-shared/src/NodeClusterSocket.ts`
- **Uncovered API records:** 2
- **Priorities:** 0 required, 1 recommended, 1 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                                  | Line | Kind               | Priority        |
| -------------------------------------------------------------------- | ---: | ------------------ | --------------- |
| `@effect/platform-node-shared/NodeClusterSocket.layerClientProtocol` |   30 | `root-declaration` | **recommended** |
| `@effect/platform-node-shared/NodeClusterSocket.layerSocketServer`   |   59 | `root-declaration` | **optional**    |

## Recommended

### `@effect/platform-node-shared/NodeClusterSocket.layerClientProtocol`

- **Source:** `packages/platform-node-shared/src/NodeClusterSocket.ts:30`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Provides the cluster `RpcClientProtocol` by opening TCP sockets to runner addresses and using the current RPC serialization service.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { NodeClusterSocket } from "@effect/platform-node-shared"` and use `NodeClusterSocket.layerClientProtocol`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `NodeClusterSocket.layerClientProtocol`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `@effect/platform-node-shared/NodeClusterSocket.layerSocketServer`

- **Source:** `packages/platform-node-shared/src/NodeClusterSocket.ts:59`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **optional**
- **Current description:** Provides the socket server used by cluster runners, listening on `ShardingConfig.runnerListenAddress` or `runnerAddress`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { NodeClusterSocket } from "@effect/platform-node-shared"` and use `NodeClusterSocket.layerSocketServer`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `NodeClusterSocket.layerSocketServer`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.
