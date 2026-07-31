# Example Suggestions: `effect/unstable/cluster/EntityType`

- **Package:** `effect`
- **Source:** `packages/effect/src/unstable/cluster/EntityType.ts`
- **Uncovered API records:** 3
- **Priorities:** 0 required, 1 recommended, 2 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                     | Line | Kind               | Priority        |
| ------------------------------------------------------- | ---: | ------------------ | --------------- |
| `effect/unstable/cluster/EntityType.EntityType (value)` |   17 | `root-declaration` | **recommended** |
| `effect/unstable/cluster/EntityType.make`               |   52 | `root-declaration` | **optional**    |
| `effect/unstable/cluster/EntityType.EntityType (type)`  |   25 | `root-declaration` | **optional**    |

## Recommended

### `effect/unstable/cluster/EntityType.EntityType (value)`

- **Source:** `packages/effect/src/unstable/cluster/EntityType.ts:17`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Schema for branded string names that identify entity types in the cluster.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { EntityType } from "effect/unstable/cluster"` and use `EntityType.EntityType`.
- **Suggested snippet:** Use `EntityType.EntityType` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `effect/unstable/cluster/EntityType.make`

- **Source:** `packages/effect/src/unstable/cluster/EntityType.ts:52`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Brands a string as an `EntityType`.
- **Signature hint:** `declare function make(value: string): EntityType`
- **Import guidance:** Start from `import { EntityType } from "effect/unstable/cluster"` and use `EntityType.make`.
- **Suggested snippet:** Construct one representative value with `EntityType.make`, then pass it to the smallest canonical getter, matcher, or runner that exposes what was created. Do not merely assert an object kind.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cluster/EntityType.EntityType (type)`

- **Source:** `packages/effect/src/unstable/cluster/EntityType.ts:25`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Branded string type representing an entity type name.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/cluster/EntityType.EntityType`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.
