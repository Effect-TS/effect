# Example Suggestions: `@effect/platform-bun/BunClusterHttp`

- **Package:** `@effect/platform-bun`
- **Source:** `packages/platform-bun/src/BunClusterHttp.ts`
- **Uncovered API records:** 3
- **Priorities:** 0 required, 2 recommended, 0 optional, 1 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                      | Line | Kind               | Priority        |
| -------------------------------------------------------- | ---: | ------------------ | --------------- |
| `@effect/platform-bun/BunClusterHttp.layerHttpServer`    |   54 | `root-declaration` | **recommended** |
| `@effect/platform-bun/BunClusterHttp.layer`              |  100 | `root-declaration` | **recommended** |
| `@effect/platform-bun/BunClusterHttp.layerK8sHttpClient` |   45 | `root-declaration` | **discouraged** |

## Recommended

### `@effect/platform-bun/BunClusterHttp.layerHttpServer`

- **Source:** `packages/platform-bun/src/BunClusterHttp.ts:54`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Layer that provides a Bun HTTP server for cluster runners.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { BunClusterHttp } from "@effect/platform-bun"` and use `BunClusterHttp.layerHttpServer`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `BunClusterHttp.layerHttpServer`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `@effect/platform-bun/BunClusterHttp.layer`

- **Source:** `packages/platform-bun/src/BunClusterHttp.ts:100`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Creates Bun cluster layers for HTTP or WebSocket transport, configuring serialization, storage, runner health, and optional client-only mode.
- **Signature hint:** `declare function layer<const ClientOnly extends boolean = false, const Storage extends 'local' | 'sql' | 'byo' = never>(options: { readonly transport: 'http' | 'websocket'; readonly serialization?: 'msgpack' | 'ndjson' | undefined; readonly serializationMaxBufferSize?: number | 'unbounded' | undefined; readonly clientOnly?: ClientOnly | undefined; readonly storage?: Storage | undefined; readonly runnerHealth?: 'ping' | 'k8s' | undefined; readonly runnerHealthK8s?: { readonly namespace?: string | undefined; readonly labelSelector?: string | undefined; } | undefined; readonly shardingConfig?: Partial<ShardingConfig.ShardingConfig['Service']> | undefined; }): ClientOnly extends true ? Layer.Layer<Sharding | Runners.Runners | ('byo' extends Storage ? never : MessageStorage.MessageStorage), Config.ConfigError, 'local' extends Storage ? never : 'byo' extends Storage ? (MessageStorage.MessageStorage | RunnerStorage.RunnerStorage) : SqlClient> : Layer.Layer<Sharding | Runners.Runners | MessageStorage.MessageStorage, ServeError | Config.ConfigError, 'local' extends Storage ? never : 'byo' extends Storage ? (MessageStorage.MessageStorage | RunnerStorage.RunnerStorage) : SqlClient>`
- **Import guidance:** Start from `import { BunClusterHttp } from "@effect/platform-bun"` and use `BunClusterHttp.layer`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Creates Bun cluster layers for HTTP or WebSocket transport, configuring serialization, storage, runner health, and optional client-only mode. Call `BunClusterHttp.layer` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Discouraged

### `@effect/platform-bun/BunClusterHttp.layerK8sHttpClient`

- **Source:** `packages/platform-bun/src/BunClusterHttp.ts:45`
- **Kind / category:** `root-declaration` / `re-exports`
- **Priority:** **discouraged**
- **Current description:** Layer that provides a Kubernetes HTTP client for runner health checks.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { BunClusterHttp } from "@effect/platform-bun"` and use `BunClusterHttp.layerK8sHttpClient`.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `BunClusterHttp.layerK8sHttpClient` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.
