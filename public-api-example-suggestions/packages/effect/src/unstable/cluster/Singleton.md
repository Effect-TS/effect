# Example Suggestions: `effect/unstable/cluster/Singleton`

- **Package:** `effect`
- **Source:** `packages/effect/src/unstable/cluster/Singleton.ts`
- **Uncovered API records:** 1
- **Priorities:** 0 required, 1 recommended, 0 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                      | Line | Kind               | Priority        |
| ---------------------------------------- | ---: | ------------------ | --------------- |
| `effect/unstable/cluster/Singleton.make` |   46 | `root-declaration` | **recommended** |

## Recommended

### `effect/unstable/cluster/Singleton.make`

- **Source:** `packages/effect/src/unstable/cluster/Singleton.ts:46`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Creates a layer that registers a singleton effect with `Sharding` under the specified name and optional shard group.
- **Signature hint:** `declare function make<E, R>(name: string, run: Effect.Effect<void, E, R>, options?: { readonly shardGroup?: string | undefined; }): Layer.Layer<never, never, Sharding | Exclude<R, Scope>>`
- **Import guidance:** Start from `import { Singleton } from "effect/unstable/cluster"` and use `Singleton.make`.
- **Suggested snippet:** Use the public setup or registry consumed by `Singleton.make`, apply the layer, and assert the registration, migration, route, resource, or other side effect documented by nearby tests. The layer provides no service, so do not write an example that yields a service from context.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.
