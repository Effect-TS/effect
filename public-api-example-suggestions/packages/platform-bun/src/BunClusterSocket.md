# Example Suggestions: `@effect/platform-bun/BunClusterSocket`

- **Package:** `@effect/platform-bun`
- **Source:** `packages/platform-bun/src/BunClusterSocket.ts`
- **Uncovered API records:** 4
- **Priorities:** 0 required, 2 recommended, 0 optional, 2 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                         | Line | Kind               | Priority        |
| ----------------------------------------------------------- | ---: | ------------------ | --------------- |
| `@effect/platform-bun/BunClusterSocket.layer`               |   59 | `root-declaration` | **recommended** |
| `@effect/platform-bun/BunClusterSocket.layerK8sHttpClient`  |  138 | `root-declaration` | **recommended** |
| `@effect/platform-bun/BunClusterSocket.layerClientProtocol` |   42 | `root-declaration` | **discouraged** |
| `@effect/platform-bun/BunClusterSocket.layerSocketServer`   |   50 | `root-declaration` | **discouraged** |

## Recommended

### `@effect/platform-bun/BunClusterSocket.layer`

- **Source:** `packages/platform-bun/src/BunClusterSocket.ts:59`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Creates Bun socket cluster layers, configuring serialization, storage, runner health, and optional client-only mode.
- **Signature hint:** `declare function layer<const ClientOnly extends boolean = false, const Storage extends 'local' | 'sql' | 'byo' = never>(options?: { readonly serialization?: 'msgpack' | 'ndjson' | undefined; readonly serializationMaxBufferSize?: number | 'unbounded' | undefined; readonly clientOnly?: ClientOnly | undefined; readonly storage?: Storage | undefined; readonly runnerHealth?: 'ping' | 'k8s' | undefined; readonly runnerHealthK8s?: { readonly namespace?: string | undefined; readonly labelSelector?: string | undefined; } | undefined; readonly shardingConfig?: Partial<ShardingConfig.ShardingConfig['Service']> | undefined; }): ClientOnly extends true ? Layer.Layer<Sharding | Runners.Runners | ('byo' extends Storage ? never : MessageStorage.MessageStorage), Config.ConfigError, 'local' extends Storage ? never : 'byo' extends Storage ? (MessageStorage.MessageStorage | RunnerStorage.RunnerStorage) : SqlClient> : Layer.Layer<Sharding | Runners.Runners | ('byo' extends Storage ? never : MessageStorage.MessageStorage), SocketServer.SocketServerError | Config.ConfigError, 'local' extends Storage ? never : 'byo' extends Storage ? (MessageStorage.MessageStorage | RunnerStorage.RunnerStorage) : SqlClient>`
- **Import guidance:** Start from `import { BunClusterSocket } from "@effect/platform-bun"` and use `BunClusterSocket.layer`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Creates Bun socket cluster layers, configuring serialization, storage, runner health, and optional client-only mode. Call `BunClusterSocket.layer` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/platform-bun/BunClusterSocket.layerK8sHttpClient`

- **Source:** `packages/platform-bun/src/BunClusterSocket.ts:138`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Layer that provides `K8sHttpClient`, using the Kubernetes service-account CA certificate when it is available.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { BunClusterSocket } from "@effect/platform-bun"` and use `BunClusterSocket.layerK8sHttpClient`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `BunClusterSocket.layerK8sHttpClient`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Discouraged

### `@effect/platform-bun/BunClusterSocket.layerClientProtocol`

- **Source:** `packages/platform-bun/src/BunClusterSocket.ts:42`
- **Kind / category:** `root-declaration` / `re-exports`
- **Priority:** **discouraged**
- **Current description:** Provides the cluster `RpcClientProtocol` using the shared socket client implementation.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { BunClusterSocket } from "@effect/platform-bun"` and use `BunClusterSocket.layerClientProtocol`.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `BunClusterSocket.layerClientProtocol` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `@effect/platform-bun/BunClusterSocket.layerSocketServer`

- **Source:** `packages/platform-bun/src/BunClusterSocket.ts:50`
- **Kind / category:** `root-declaration` / `re-exports`
- **Priority:** **discouraged**
- **Current description:** Provides the socket server used by Bun cluster runners through the shared socket server implementation.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { BunClusterSocket } from "@effect/platform-bun"` and use `BunClusterSocket.layerSocketServer`.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `BunClusterSocket.layerSocketServer` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.
