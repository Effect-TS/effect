# Example Suggestions: `effect/unstable/cluster/Sharding`

- **Package:** `effect`
- **Source:** `packages/effect/src/unstable/cluster/Sharding.ts`
- **Uncovered API records:** 2
- **Priorities:** 0 required, 2 recommended, 0 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                         | Line | Kind               | Priority        |
| ------------------------------------------- | ---: | ------------------ | --------------- |
| `effect/unstable/cluster/Sharding.layer`    | 1608 | `root-declaration` | **recommended** |
| `effect/unstable/cluster/Sharding.Sharding` |   88 | `root-declaration` | **recommended** |

## Recommended

### `effect/unstable/cluster/Sharding.layer`

- **Source:** `packages/effect/src/unstable/cluster/Sharding.ts:1608`
- **Kind / category:** `root-declaration` / `layers`
- **Priority:** **recommended**
- **Current description:** Layer that constructs the `Sharding` service from sharding configuration, runner communication, message storage, runner storage, runner health, the snowflake generator, and the entity reaper.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Sharding } from "effect/unstable/cluster"` and use `Sharding.layer`.
- **Suggested snippet:** Build the smallest Effect that consumes the service provided by `Sharding.layer`, provide the layer, run the Effect, and assert the service result. If the production layer performs external I/O, use only a package-supported in-memory test implementation or leave it example-free.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/cluster/Sharding.Sharding`

- **Source:** `packages/effect/src/unstable/cluster/Sharding.ts:88`
- **Kind / category:** `root-declaration` / `services`
- **Priority:** **recommended**
- **Current description:** Service that registers entities and singletons, routes messages to owned shards, generates runner-local snowflake ids, and polls storage for persisted work.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Sharding } from "effect/unstable/cluster"` and use `Sharding.Sharding`.
- **Suggested snippet:** Consume `Sharding.Sharding` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.
