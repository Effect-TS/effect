# Example Suggestions: `effect/unstable/cluster/ShardingConfig`

- **Package:** `effect`
- **Source:** `packages/effect/src/unstable/cluster/ShardingConfig.ts`
- **Uncovered API records:** 8
- **Priorities:** 0 required, 5 recommended, 3 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                       | Line | Kind               | Priority        |
| --------------------------------------------------------- | ---: | ------------------ | --------------- |
| `effect/unstable/cluster/ShardingConfig.layer`            |  207 | `root-declaration` | **recommended** |
| `effect/unstable/cluster/ShardingConfig.layerDefaults`    |  216 | `root-declaration` | **recommended** |
| `effect/unstable/cluster/ShardingConfig.layerFromEnv`     |  344 | `root-declaration` | **recommended** |
| `effect/unstable/cluster/ShardingConfig.configFromEnv`    |  328 | `root-declaration` | **recommended** |
| `effect/unstable/cluster/ShardingConfig.shardGroupConfig` |  359 | `root-declaration` | **recommended** |
| `effect/unstable/cluster/ShardingConfig.defaults`         |  154 | `root-declaration` | **optional**    |
| `effect/unstable/cluster/ShardingConfig.config`           |  225 | `root-declaration` | **optional**    |
| `effect/unstable/cluster/ShardingConfig.ShardingConfig`   |   29 | `root-declaration` | **optional**    |

## Recommended

### `effect/unstable/cluster/ShardingConfig.layer`

- **Source:** `packages/effect/src/unstable/cluster/ShardingConfig.ts:207`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Creates a `ShardingConfig` layer by merging the provided partial options over `defaults`.
- **Signature hint:** `declare function layer(options?: Partial<ShardingConfig['Service']>): Layer.Layer<ShardingConfig>`
- **Import guidance:** Start from `import { ShardingConfig } from "effect/unstable/cluster"` and use `ShardingConfig.layer`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `ShardingConfig.layer`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/cluster/ShardingConfig.layerDefaults`

- **Source:** `packages/effect/src/unstable/cluster/ShardingConfig.ts:216`
- **Kind / category:** `root-declaration` / `defaults`
- **Priority:** **recommended**
- **Current description:** Layer that provides the default `ShardingConfig` values.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { ShardingConfig } from "effect/unstable/cluster"` and use `ShardingConfig.layerDefaults`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `ShardingConfig.layerDefaults`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/cluster/ShardingConfig.layerFromEnv`

- **Source:** `packages/effect/src/unstable/cluster/ShardingConfig.ts:344`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Layer that loads `ShardingConfig` from environment variables and, when options are provided, overlays those options on top of the loaded values.
- **Signature hint:** `declare function layerFromEnv(options?: Partial<ShardingConfig['Service']> | undefined): Layer.Layer<ShardingConfig, Config.ConfigError>`
- **Import guidance:** Start from `import { ShardingConfig } from "effect/unstable/cluster"` and use `ShardingConfig.layerFromEnv`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `ShardingConfig.layerFromEnv`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/cluster/ShardingConfig.configFromEnv`

- **Source:** `packages/effect/src/unstable/cluster/ShardingConfig.ts:328`
- **Kind / category:** `root-declaration` / `configuration`
- **Priority:** **recommended**
- **Current description:** Effect that loads `ShardingConfig` from environment variables using the constant-case config provider.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { ShardingConfig } from "effect/unstable/cluster"` and use `ShardingConfig.configFromEnv`.
- **Suggested snippet:** Use `ShardingConfig.configFromEnv` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/cluster/ShardingConfig.shardGroupConfig`

- **Source:** `packages/effect/src/unstable/cluster/ShardingConfig.ts:359`
- **Kind / category:** `root-declaration` / `Shard groups`
- **Priority:** **recommended**
- **Current description:** Normalizes the provided `ShardingConfig` to calculate the `available` and `assigned` shard groups.
- **Signature hint:** `declare function shardGroupConfig(config: ShardingConfig['Service']): { readonly available: ReadonlySet<string>; readonly assigned: ReadonlySet<string>; }`
- **Import guidance:** Start from `import { ShardingConfig } from "effect/unstable/cluster"` and use `ShardingConfig.shardGroupConfig`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Normalizes the provided `ShardingConfig` to calculate the `available` and `assigned` shard groups. Call `ShardingConfig.shardGroupConfig` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `effect/unstable/cluster/ShardingConfig.defaults`

- **Source:** `packages/effect/src/unstable/cluster/ShardingConfig.ts:154`
- **Kind / category:** `root-declaration` / `defaults`
- **Priority:** **optional**
- **Current description:** Default values for `ShardingConfig`, including the default local runner address, shard group, shard count, mailbox settings, polling intervals, and remote serialization simulation.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { ShardingConfig } from "effect/unstable/cluster"` and use `ShardingConfig.defaults`.
- **Suggested snippet:** Use `ShardingConfig.defaults` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cluster/ShardingConfig.config`

- **Source:** `packages/effect/src/unstable/cluster/ShardingConfig.ts:225`
- **Kind / category:** `root-declaration` / `configuration`
- **Priority:** **optional**
- **Current description:** Describes how to load `ShardingConfig` values, applying the same defaults used by the in-memory `defaults` object.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { ShardingConfig } from "effect/unstable/cluster"` and use `ShardingConfig.config`.
- **Suggested snippet:** Use `ShardingConfig.config` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cluster/ShardingConfig.ShardingConfig`

- **Source:** `packages/effect/src/unstable/cluster/ShardingConfig.ts:29`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Represents the configuration for the `Sharding` service on a given runner.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { ShardingConfig } from "effect/unstable/cluster"` and use `ShardingConfig.ShardingConfig`.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `ShardingConfig.ShardingConfig`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.
