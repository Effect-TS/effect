# Example Suggestions: `effect/unstable/cluster/ClusterCron`

- **Package:** `effect`
- **Source:** `packages/effect/src/unstable/cluster/ClusterCron.ts`
- **Uncovered API records:** 1
- **Priorities:** 0 required, 1 recommended, 0 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                        | Line | Kind               | Priority        |
| ------------------------------------------ | ---: | ------------------ | --------------- |
| `effect/unstable/cluster/ClusterCron.make` |   43 | `root-declaration` | **recommended** |

## Recommended

### `effect/unstable/cluster/ClusterCron.make`

- **Source:** `packages/effect/src/unstable/cluster/ClusterCron.ts:43`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Creates a layer that runs a cron job through the cluster sharding system.
- **Signature hint:** `declare function make<E, R>(options: { readonly name: string; readonly cron: Cron.Cron; readonly execute: Effect.Effect<void, E, R>; readonly shardGroup?: string | undefined; readonly calculateNextRunFromPrevious?: boolean | undefined; readonly skipIfOlderThan?: Duration.Input | undefined; }): Layer.Layer<never, never, Sharding | Exclude<R, Scope>>`
- **Import guidance:** Start from `import { ClusterCron } from "effect/unstable/cluster"` and use `ClusterCron.make`.
- **Suggested snippet:** Use the public setup or registry consumed by `ClusterCron.make`, apply the layer, and assert the registration, migration, route, resource, or other side effect documented by nearby tests. The layer provides no service, so do not write an example that yields a service from context.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.
