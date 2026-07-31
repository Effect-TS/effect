# Example Suggestions: `effect/unstable/cluster/SingleRunner`

- **Package:** `effect`
- **Source:** `packages/effect/src/unstable/cluster/SingleRunner.ts`
- **Uncovered API records:** 1
- **Priorities:** 0 required, 1 recommended, 0 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                          | Line | Kind               | Priority        |
| -------------------------------------------- | ---: | ------------------ | --------------- |
| `effect/unstable/cluster/SingleRunner.layer` |   59 | `root-declaration` | **recommended** |

## Recommended

### `effect/unstable/cluster/SingleRunner.layer`

- **Source:** `packages/effect/src/unstable/cluster/SingleRunner.ts:59`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Provides a SQL-backed single-node cluster for running durable entities and workflows.
- **Signature hint:** `declare function layer(options?: { readonly shardingConfig?: Partial<ShardingConfig.ShardingConfig['Service']> | undefined; readonly runnerStorage?: 'memory' | 'sql' | undefined; }): Layer.Layer<Sharding.Sharding | Runners.Runners | MessageStorage.MessageStorage, ConfigError, SqlClient.SqlClient | Crypto.Crypto>`
- **Import guidance:** Start from `import { SingleRunner } from "effect/unstable/cluster"` and use `SingleRunner.layer`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `SingleRunner.layer`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.
