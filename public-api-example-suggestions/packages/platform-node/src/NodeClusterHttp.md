# Example Suggestions: `@effect/platform-node/NodeClusterHttp`

- **Package:** `@effect/platform-node`
- **Source:** `packages/platform-node/src/NodeClusterHttp.ts`
- **Uncovered API records:** 3
- **Priorities:** 0 required, 1 recommended, 1 optional, 1 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                        | Line | Kind               | Priority        |
| ---------------------------------------------------------- | ---: | ------------------ | --------------- |
| `@effect/platform-node/NodeClusterHttp.layer`              |   58 | `root-declaration` | **recommended** |
| `@effect/platform-node/NodeClusterHttp.layerHttpServer`    |  145 | `root-declaration` | **optional**    |
| `@effect/platform-node/NodeClusterHttp.layerK8sHttpClient` |   47 | `root-declaration` | **discouraged** |

## Recommended

### `@effect/platform-node/NodeClusterHttp.layer`

- **Source:** `packages/platform-node/src/NodeClusterHttp.ts:58`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Builds the Node cluster HTTP/WebSocket sharding layer, configuring runner transport, RPC serialization, message storage, runner health checks, and optional client-only mode.
- **Signature hint:** `declare function layer<const ClientOnly extends boolean = false, const Storage extends 'local' | 'sql' | 'byo' = never>(options: { readonly transport: 'http' | 'websocket'; readonly serialization?: 'msgpack' | 'ndjson' | undefined; readonly serializationMaxBufferSize?: number | 'unbounded' | undefined; readonly clientOnly?: ClientOnly | undefined; readonly storage?: Storage | undefined; readonly runnerHealth?: 'ping' | 'k8s' | undefined; readonly runnerHealthK8s?: { readonly namespace?: string | undefined; readonly labelSelector?: string | undefined; } | undefined; readonly shardingConfig?: Partial<ShardingConfig.ShardingConfig['Service']> | undefined; }): ClientOnly extends true ? Layer.Layer<Sharding | Runners.Runners | ('byo' extends Storage ? never : MessageStorage.MessageStorage), Config.ConfigError, 'local' extends Storage ? never : 'byo' extends Storage ? (MessageStorage.MessageStorage | RunnerStorage.RunnerStorage) : SqlClient> : Layer.Layer<Sharding | Runners.Runners | ('byo' extends Storage ? never : MessageStorage.MessageStorage), ServeError | Config.ConfigError, 'local' extends Storage ? never : 'byo' extends Storage ? (MessageStorage.MessageStorage | RunnerStorage.RunnerStorage) : SqlClient>`
- **Import guidance:** Start from `import { NodeClusterHttp } from "@effect/platform-node"` and use `NodeClusterHttp.layer`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Builds the Node cluster HTTP/WebSocket sharding layer, configuring runner transport, RPC serialization, message storage, runner health checks, and optional client-only mode. Call `NodeClusterHttp.layer` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `@effect/platform-node/NodeClusterHttp.layerHttpServer`

- **Source:** `packages/platform-node/src/NodeClusterHttp.ts:145`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **optional**
- **Current description:** Provides the HTTP server and Node HTTP services used by cluster runners, listening on `ShardingConfig.runnerListenAddress` or `runnerAddress`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { NodeClusterHttp } from "@effect/platform-node"` and use `NodeClusterHttp.layerHttpServer`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `NodeClusterHttp.layerHttpServer`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

## Discouraged

### `@effect/platform-node/NodeClusterHttp.layerK8sHttpClient`

- **Source:** `packages/platform-node/src/NodeClusterHttp.ts:47`
- **Kind / category:** `root-declaration` / `re-exports`
- **Priority:** **discouraged**
- **Current description:** Provides the Kubernetes HTTP client layer used by Kubernetes runner health checks.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { NodeClusterHttp } from "@effect/platform-node"` and use `NodeClusterHttp.layerK8sHttpClient`.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `NodeClusterHttp.layerK8sHttpClient` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.
