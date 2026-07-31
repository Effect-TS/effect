# Example Suggestions: `effect/unstable/cluster/RunnerStorage`

- **Package:** `effect`
- **Source:** `packages/effect/src/unstable/cluster/RunnerStorage.ts`
- **Uncovered API records:** 13
- **Priorities:** 0 required, 2 recommended, 11 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                             | Line | Kind               | Priority        |
| --------------------------------------------------------------- | ---: | ------------------ | --------------- |
| `effect/unstable/cluster/RunnerStorage.makeEncoded`             |  151 | `root-declaration` | **recommended** |
| `effect/unstable/cluster/RunnerStorage.layerMemory`             |  237 | `root-declaration` | **recommended** |
| `effect/unstable/cluster/RunnerStorage.Encoded`                 |   90 | `root-declaration` | **optional**    |
| `effect/unstable/cluster/RunnerStorage.makeMemory`              |  204 | `root-declaration` | **optional**    |
| `effect/unstable/cluster/RunnerStorage.RunnerStorage`           |   30 | `root-declaration` | **optional**    |
| `effect/unstable/cluster/RunnerStorage.Encoded.getRunners`      |   94 | `member`           | **optional**    |
| `effect/unstable/cluster/RunnerStorage.Encoded.register`        |   99 | `member`           | **optional**    |
| `effect/unstable/cluster/RunnerStorage.Encoded.unregister`      |  104 | `member`           | **optional**    |
| `effect/unstable/cluster/RunnerStorage.Encoded.setRunnerHealth` |  109 | `member`           | **optional**    |
| `effect/unstable/cluster/RunnerStorage.Encoded.acquire`         |  115 | `member`           | **optional**    |
| `effect/unstable/cluster/RunnerStorage.Encoded.refresh`         |  124 | `member`           | **optional**    |
| `effect/unstable/cluster/RunnerStorage.Encoded.release`         |  132 | `member`           | **optional**    |
| `effect/unstable/cluster/RunnerStorage.Encoded.releaseAll`      |  140 | `member`           | **optional**    |

## Recommended

### `effect/unstable/cluster/RunnerStorage.makeEncoded`

- **Source:** `packages/effect/src/unstable/cluster/RunnerStorage.ts:151`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Adapts an encoded runner storage implementation into `RunnerStorage`, converting runner addresses, runners, machine ids, and shard ids between typed values and their string or numeric storage forms.
- **Signature hint:** `declare function makeEncoded(encoded: Encoded): { readonly register: (runner: Runner, healthy: boolean) => Effect.Effect<MachineId.MachineId, PersistenceError>; readonly unregister: (address: RunnerAddress) => Effect.Effect<void, PersistenceError>; readonly getRunners: Effect.Effect<Array<readonly [runner: Runner, healthy: boolean]>, PersistenceError>; readonly setRunnerHealth: (address: RunnerAddress, healthy: boolean) => Effect.Effect<void, PersistenceError>; readonly acquire: (address: RunnerAddress, shardIds: Iterable<ShardId.ShardId>) => Effect.Effect<Array<ShardId.ShardId>, PersistenceError>; readonly refresh: (address: RunnerAddress, shardIds: Iterable<ShardId.ShardId>) => Effect.Effect<Array<ShardId.ShardId>, PersistenceError>; readonly release: (address: RunnerAddress, shardId: ShardId.ShardId) => Effect.Effect<void, PersistenceError>; readonly releaseAll: (address: RunnerAddress) => Effect.Effect<void, PersistenceError>; }`
- **Import guidance:** Start from `import { RunnerStorage } from "effect/unstable/cluster"` and use `RunnerStorage.makeEncoded`.
- **Suggested snippet:** Construct one representative value with `RunnerStorage.makeEncoded`, then pass it to the smallest canonical getter, matcher, or runner that exposes what was created. Do not merely assert an object kind.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/cluster/RunnerStorage.layerMemory`

- **Source:** `packages/effect/src/unstable/cluster/RunnerStorage.ts:237`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Layer that provides the in-memory `RunnerStorage` implementation.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { RunnerStorage } from "effect/unstable/cluster"` and use `RunnerStorage.layerMemory`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `RunnerStorage.layerMemory`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `effect/unstable/cluster/RunnerStorage.Encoded`

- **Source:** `packages/effect/src/unstable/cluster/RunnerStorage.ts:90`
- **Kind / category:** `root-declaration` / `Encoded`
- **Priority:** **optional**
- **Current description:** String-encoded runner storage interface used by adapters that persist runner addresses, runners, machine ids, and shard ids outside the in-memory model.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/cluster/RunnerStorage.Encoded`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cluster/RunnerStorage.makeMemory`

- **Source:** `packages/effect/src/unstable/cluster/RunnerStorage.ts:204`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Creates an in-memory `RunnerStorage` implementation for tests and local use.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { RunnerStorage } from "effect/unstable/cluster"` and use `RunnerStorage.makeMemory`.
- **Suggested snippet:** Construct one representative value with `RunnerStorage.makeMemory`, then pass it to the smallest canonical getter, matcher, or runner that exposes what was created. Do not merely assert an object kind.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cluster/RunnerStorage.RunnerStorage`

- **Source:** `packages/effect/src/unstable/cluster/RunnerStorage.ts:30`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Represents a generic interface to the persistent storage required by the cluster.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { RunnerStorage } from "effect/unstable/cluster"` and use `RunnerStorage.RunnerStorage`.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `RunnerStorage.RunnerStorage`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cluster/RunnerStorage.Encoded.getRunners`

- **Source:** `packages/effect/src/unstable/cluster/RunnerStorage.ts:94`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Get all runners registered with the cluster.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/cluster/RunnerStorage.Encoded.getRunners` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cluster/RunnerStorage.Encoded.register`

- **Source:** `packages/effect/src/unstable/cluster/RunnerStorage.ts:99`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Register a new runner with the cluster.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/cluster/RunnerStorage.Encoded.register` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cluster/RunnerStorage.Encoded.unregister`

- **Source:** `packages/effect/src/unstable/cluster/RunnerStorage.ts:104`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Unregister the runner with the given address.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/cluster/RunnerStorage.Encoded.unregister` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cluster/RunnerStorage.Encoded.setRunnerHealth`

- **Source:** `packages/effect/src/unstable/cluster/RunnerStorage.ts:109`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Set the health status of the given runner.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/cluster/RunnerStorage.Encoded.setRunnerHealth` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cluster/RunnerStorage.Encoded.acquire`

- **Source:** `packages/effect/src/unstable/cluster/RunnerStorage.ts:115`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Acquire the lock on the given shards, returning the shards that were successfully locked.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/cluster/RunnerStorage.Encoded.acquire` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Optional contrast:** Record acquisition and release events and assert cleanup after the scope closes.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cluster/RunnerStorage.Encoded.refresh`

- **Source:** `packages/effect/src/unstable/cluster/RunnerStorage.ts:124`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Refresh the lock on the given shards, returning the shards that were successfully locked.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/cluster/RunnerStorage.Encoded.refresh` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cluster/RunnerStorage.Encoded.release`

- **Source:** `packages/effect/src/unstable/cluster/RunnerStorage.ts:132`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Release the lock on the given shard.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/cluster/RunnerStorage.Encoded.release` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Optional contrast:** Record acquisition and release events and assert cleanup after the scope closes.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cluster/RunnerStorage.Encoded.releaseAll`

- **Source:** `packages/effect/src/unstable/cluster/RunnerStorage.ts:140`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Release the lock on all shards for the given runner.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/cluster/RunnerStorage.Encoded.releaseAll` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Optional contrast:** Record acquisition and release events and assert cleanup after the scope closes.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.
