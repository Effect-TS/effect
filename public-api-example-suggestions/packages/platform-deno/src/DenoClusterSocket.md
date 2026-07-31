# Example Suggestions: `@effect/platform-deno/DenoClusterSocket`

- **Package:** `@effect/platform-deno`
- **Source:** `packages/platform-deno/src/DenoClusterSocket.ts`
- **Uncovered API records:** 4
- **Priorities:** 0 required, 2 recommended, 2 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                           | Line | Kind               | Priority        |
| ------------------------------------------------------------- | ---: | ------------------ | --------------- |
| `@effect/platform-deno/DenoClusterSocket.layer`               |   95 | `root-declaration` | **recommended** |
| `@effect/platform-deno/DenoClusterSocket.layerK8sHttpClient`  |  173 | `root-declaration` | **recommended** |
| `@effect/platform-deno/DenoClusterSocket.layerClientProtocol` |   44 | `root-declaration` | **optional**    |
| `@effect/platform-deno/DenoClusterSocket.layerSocketServer`   |   72 | `root-declaration` | **optional**    |

## Recommended

### `@effect/platform-deno/DenoClusterSocket.layer`

- **Source:** `packages/platform-deno/src/DenoClusterSocket.ts:95`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Creates Deno socket cluster layers, configuring serialization, storage, runner health, and optional client-only mode.
- **Signature hint:** `declare function layer<const ClientOnly extends boolean = false, const Storage extends 'local' | 'sql' | 'byo' = never>(options?: { readonly serialization?: 'msgpack' | 'ndjson' | undefined; readonly serializationMaxBufferSize?: number | 'unbounded' | undefined; readonly clientOnly?: ClientOnly | undefined; readonly storage?: Storage | undefined; readonly runnerHealth?: 'ping' | 'k8s' | undefined; readonly runnerHealthK8s?: { readonly namespace?: string | undefined; readonly labelSelector?: string | undefined; } | undefined; readonly shardingConfig?: Partial<ShardingConfig.ShardingConfig['Service']> | undefined; }): ClientOnly extends true ? Layer.Layer<Sharding | Runners.Runners | ('byo' extends Storage ? never : MessageStorage.MessageStorage), Config.ConfigError, 'local' extends Storage ? never : 'byo' extends Storage ? (MessageStorage.MessageStorage | RunnerStorage.RunnerStorage) : SqlClient> : Layer.Layer<Sharding | Runners.Runners | ('byo' extends Storage ? never : MessageStorage.MessageStorage), SocketServer.SocketServerError | Config.ConfigError, 'local' extends Storage ? never : 'byo' extends Storage ? (MessageStorage.MessageStorage | RunnerStorage.RunnerStorage) : SqlClient>`
- **Import guidance:** Start from `import { DenoClusterSocket } from "@effect/platform-deno"` and use `DenoClusterSocket.layer`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Creates Deno socket cluster layers, configuring serialization, storage, runner health, and optional client-only mode. Call `DenoClusterSocket.layer` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/platform-deno/DenoClusterSocket.layerK8sHttpClient`

- **Source:** `packages/platform-deno/src/DenoClusterSocket.ts:173`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Layer that provides `K8sHttpClient`, using a scoped native Deno HTTP client with the Kubernetes service-account CA certificate when it is available.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { DenoClusterSocket } from "@effect/platform-deno"` and use `DenoClusterSocket.layerK8sHttpClient`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `DenoClusterSocket.layerK8sHttpClient`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Optional contrast:** Record acquisition and release events and assert cleanup after the scope closes.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `@effect/platform-deno/DenoClusterSocket.layerClientProtocol`

- **Source:** `packages/platform-deno/src/DenoClusterSocket.ts:44`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **optional**
- **Current description:** Provides the cluster `RpcClientProtocol` using native Deno TCP sockets.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { DenoClusterSocket } from "@effect/platform-deno"` and use `DenoClusterSocket.layerClientProtocol`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `DenoClusterSocket.layerClientProtocol`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `@effect/platform-deno/DenoClusterSocket.layerSocketServer`

- **Source:** `packages/platform-deno/src/DenoClusterSocket.ts:72`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **optional**
- **Current description:** Provides the native Deno socket server used by cluster runners, listening on `ShardingConfig.runnerListenAddress` or `runnerAddress`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { DenoClusterSocket } from "@effect/platform-deno"` and use `DenoClusterSocket.layerSocketServer`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `DenoClusterSocket.layerSocketServer`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.
