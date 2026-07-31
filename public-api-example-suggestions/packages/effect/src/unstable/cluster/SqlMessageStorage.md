# Example Suggestions: `effect/unstable/cluster/SqlMessageStorage`

- **Package:** `effect`
- **Source:** `packages/effect/src/unstable/cluster/SqlMessageStorage.ts`
- **Uncovered API records:** 3
- **Priorities:** 0 required, 3 recommended, 0 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                   | Line | Kind               | Priority        |
| ----------------------------------------------------- | ---: | ------------------ | --------------- |
| `effect/unstable/cluster/SqlMessageStorage.layer`     |  710 | `root-declaration` | **recommended** |
| `effect/unstable/cluster/SqlMessageStorage.layerWith` |  724 | `root-declaration` | **recommended** |
| `effect/unstable/cluster/SqlMessageStorage.make`      |   67 | `root-declaration` | **recommended** |

## Recommended

### `effect/unstable/cluster/SqlMessageStorage.layer`

- **Source:** `packages/effect/src/unstable/cluster/SqlMessageStorage.ts:710`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Layer that provides SQL-backed `MessageStorage` using the default table prefix and the default snowflake generator.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { SqlMessageStorage } from "effect/unstable/cluster"` and use `SqlMessageStorage.layer`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `SqlMessageStorage.layer`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/cluster/SqlMessageStorage.layerWith`

- **Source:** `packages/effect/src/unstable/cluster/SqlMessageStorage.ts:724`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Layer that provides SQL-backed `MessageStorage` using a custom table prefix.
- **Signature hint:** `declare function layerWith(options: { readonly prefix?: string | undefined; }): Layer.Layer<MessageStorage.MessageStorage, never, SqlClient.SqlClient | ShardingConfig | Crypto.Crypto>`
- **Import guidance:** Start from `import { SqlMessageStorage } from "effect/unstable/cluster"` and use `SqlMessageStorage.layerWith`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `SqlMessageStorage.layerWith`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/cluster/SqlMessageStorage.make`

- **Source:** `packages/effect/src/unstable/cluster/SqlMessageStorage.ts:67`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Creates a SQL-backed `MessageStorage` implementation, running its migrations and using the optional table prefix.
- **Signature hint:** `declare function make(options?: { readonly prefix?: string | undefined; }): Effect.Effect<MessageStorage.MessageStorage['Service'], never, SqlClient.SqlClient | Snowflake.Generator | Crypto.Crypto>`
- **Import guidance:** Start from `import { SqlMessageStorage } from "effect/unstable/cluster"` and use `SqlMessageStorage.make`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `SqlMessageStorage.make`, execute it explicitly, and assert its semantic success value or captured failure.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.
