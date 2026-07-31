# Example Suggestions: `effect/unstable/cluster/SqlRunnerStorage`

- **Package:** `effect`
- **Source:** `packages/effect/src/unstable/cluster/SqlRunnerStorage.ts`
- **Uncovered API records:** 3
- **Priorities:** 0 required, 3 recommended, 0 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                  | Line | Kind               | Priority        |
| ---------------------------------------------------- | ---: | ------------------ | --------------- |
| `effect/unstable/cluster/SqlRunnerStorage.make`      |   70 | `root-declaration` | **recommended** |
| `effect/unstable/cluster/SqlRunnerStorage.layer`     |  775 | `root-declaration` | **recommended** |
| `effect/unstable/cluster/SqlRunnerStorage.layerWith` |  787 | `root-declaration` | **recommended** |

## Recommended

### `effect/unstable/cluster/SqlRunnerStorage.make`

- **Source:** `packages/effect/src/unstable/cluster/SqlRunnerStorage.ts:70`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Creates a SQL-backed `RunnerStorage` implementation for registered runners and shard locks, using the configured table prefix and advisory locks where supported and enabled.
- **Signature hint:** `declare function make(options: { readonly prefix?: string | undefined; }): Effect.Effect<{ readonly register: (runner: Runner, healthy: boolean) => Effect.Effect<MachineId, PersistenceError>; readonly unregister: (address: RunnerAddress) => Effect.Effect<void, PersistenceError>; readonly getRunners: Effect.Effect<Array<readonly [runner: Runner, healthy: boolean]>, PersistenceError>; readonly setRunnerHealth: (address: RunnerAddress, healthy: boolean) => Effect.Effect<void, PersistenceError>; readonly acquire: (address: RunnerAddress, shardIds: Iterable<ShardId.ShardId>) => Effect.Effect<Array<ShardId.ShardId>, PersistenceError>; readonly refresh: (address: RunnerAddress, shardIds: Iterable<ShardId.ShardId>) => Effect.Effect<Array<ShardId.ShardId>, PersistenceError>; readonly release: (address: RunnerAddress, shardId: ShardId.ShardId) => Effect.Effect<void, PersistenceError>; readonly releaseAll: (address: RunnerAddress) => Effect.Effect<void, PersistenceError>; }, SqlError, Scope.Scope | ShardingConfig.ShardingConfig | SqlClient.SqlClient>`
- **Import guidance:** Start from `import { SqlRunnerStorage } from "effect/unstable/cluster"` and use `SqlRunnerStorage.make`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `SqlRunnerStorage.make`, execute it explicitly, and assert its semantic success value or captured failure.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/cluster/SqlRunnerStorage.layer`

- **Source:** `packages/effect/src/unstable/cluster/SqlRunnerStorage.ts:775`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Layer that provides SQL-backed `RunnerStorage` using the default table prefix.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { SqlRunnerStorage } from "effect/unstable/cluster"` and use `SqlRunnerStorage.layer`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `SqlRunnerStorage.layer`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/cluster/SqlRunnerStorage.layerWith`

- **Source:** `packages/effect/src/unstable/cluster/SqlRunnerStorage.ts:787`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Layer that provides SQL-backed `RunnerStorage` using a custom table prefix.
- **Signature hint:** `declare function layerWith(options: { readonly prefix?: string | undefined; }): Layer.Layer<RunnerStorage.RunnerStorage, SqlError, SqlClient.SqlClient | ShardingConfig.ShardingConfig>`
- **Import guidance:** Start from `import { SqlRunnerStorage } from "effect/unstable/cluster"` and use `SqlRunnerStorage.layerWith`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `SqlRunnerStorage.layerWith`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.
