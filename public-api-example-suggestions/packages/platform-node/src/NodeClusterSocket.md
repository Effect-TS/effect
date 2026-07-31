# Example Suggestions: `@effect/platform-node/NodeClusterSocket`

- **Package:** `@effect/platform-node`
- **Source:** `packages/platform-node/src/NodeClusterSocket.ts`
- **Uncovered API records:** 5
- **Priorities:** 0 required, 2 recommended, 1 optional, 2 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                           | Line | Kind               | Priority        |
| ------------------------------------------------------------- | ---: | ------------------ | --------------- |
| `@effect/platform-node/NodeClusterSocket.layer`               |   63 | `root-declaration` | **recommended** |
| `@effect/platform-node/NodeClusterSocket.layerDispatcherK8s`  |  144 | `root-declaration` | **recommended** |
| `@effect/platform-node/NodeClusterSocket.layerK8sHttpClient`  |  178 | `root-declaration` | **optional**    |
| `@effect/platform-node/NodeClusterSocket.layerClientProtocol` |   44 | `root-declaration` | **discouraged** |
| `@effect/platform-node/NodeClusterSocket.layerSocketServer`   |   52 | `root-declaration` | **discouraged** |

## Recommended

### `@effect/platform-node/NodeClusterSocket.layer`

- **Source:** `packages/platform-node/src/NodeClusterSocket.ts:63`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Builds the Node cluster socket sharding layer, configuring RPC serialization, message storage, runner health checks, and optional client-only mode.
- **Signature hint:** `declare function layer<const ClientOnly extends boolean = false, const Storage extends 'local' | 'sql' | 'byo' = never>(options?: { readonly serialization?: 'msgpack' | 'ndjson' | undefined; readonly serializationMaxBufferSize?: number | 'unbounded' | undefined; readonly clientOnly?: ClientOnly | undefined; readonly storage?: Storage | undefined; readonly runnerHealth?: 'ping' | 'k8s' | undefined; readonly runnerHealthK8s?: { readonly namespace?: string | undefined; readonly labelSelector?: string | undefined; } | undefined; readonly shardingConfig?: Partial<ShardingConfig.ShardingConfig['Service']> | undefined; }): ClientOnly extends true ? Layer.Layer<Sharding | Runners.Runners | ('byo' extends Storage ? never : MessageStorage.MessageStorage), ConfigError, 'local' extends Storage ? never : 'byo' extends Storage ? (MessageStorage.MessageStorage | RunnerStorage.RunnerStorage) : SqlClient> : Layer.Layer<Sharding | Runners.Runners | ('byo' extends Storage ? never : MessageStorage.MessageStorage), SocketServer.SocketServerError | ConfigError, 'local' extends Storage ? never : 'byo' extends Storage ? (MessageStorage.MessageStorage | RunnerStorage.RunnerStorage) : SqlClient>`
- **Import guidance:** Start from `import { NodeClusterSocket } from "@effect/platform-node"` and use `NodeClusterSocket.layer`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Builds the Node cluster socket sharding layer, configuring RPC serialization, message storage, runner health checks, and optional client-only mode. Call `NodeClusterSocket.layer` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/platform-node/NodeClusterSocket.layerDispatcherK8s`

- **Source:** `packages/platform-node/src/NodeClusterSocket.ts:144`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Provides an Undici dispatcher for Kubernetes API calls, using the service account CA certificate when it is available and falling back to the default dispatcher otherwise.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { NodeClusterSocket } from "@effect/platform-node"` and use `NodeClusterSocket.layerDispatcherK8s`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `NodeClusterSocket.layerDispatcherK8s`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `@effect/platform-node/NodeClusterSocket.layerK8sHttpClient`

- **Source:** `packages/platform-node/src/NodeClusterSocket.ts:178`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **optional**
- **Current description:** Provides a `K8sHttpClient` backed by the Undici HTTP client and the Kubernetes-aware dispatcher.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { NodeClusterSocket } from "@effect/platform-node"` and use `NodeClusterSocket.layerK8sHttpClient`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `NodeClusterSocket.layerK8sHttpClient`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

## Discouraged

### `@effect/platform-node/NodeClusterSocket.layerClientProtocol`

- **Source:** `packages/platform-node/src/NodeClusterSocket.ts:44`
- **Kind / category:** `root-declaration` / `re-exports`
- **Priority:** **discouraged**
- **Current description:** Provides the cluster `RpcClientProtocol` using the shared socket client implementation.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { NodeClusterSocket } from "@effect/platform-node"` and use `NodeClusterSocket.layerClientProtocol`.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `NodeClusterSocket.layerClientProtocol` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `@effect/platform-node/NodeClusterSocket.layerSocketServer`

- **Source:** `packages/platform-node/src/NodeClusterSocket.ts:52`
- **Kind / category:** `root-declaration` / `re-exports`
- **Priority:** **discouraged**
- **Current description:** Provides the socket server used by Node cluster runners through the shared socket server implementation.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { NodeClusterSocket } from "@effect/platform-node"` and use `NodeClusterSocket.layerSocketServer`.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `NodeClusterSocket.layerSocketServer` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.
