# Example Suggestions: `effect/unstable/cluster/ShardingRegistrationEvent`

- **Package:** `effect`
- **Source:** `packages/effect/src/unstable/cluster/ShardingRegistrationEvent.ts`
- **Uncovered API records:** 4
- **Priorities:** 0 required, 0 recommended, 4 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                                                               | Line | Kind               | Priority     |
| ------------------------------------------------------------------------------------------------- | ---: | ------------------ | ------------ |
| `effect/unstable/cluster/ShardingRegistrationEvent.$match, EntityRegistered, SingletonRegistered` |   53 | `root-declaration` | **optional** |
| `effect/unstable/cluster/ShardingRegistrationEvent.ShardingRegistrationEvent`                     |   20 | `root-declaration` | **optional** |
| `effect/unstable/cluster/ShardingRegistrationEvent.EntityRegistered`                              |   30 | `root-declaration` | **optional** |
| `effect/unstable/cluster/ShardingRegistrationEvent.SingletonRegistered`                           |   42 | `root-declaration` | **optional** |

## Optional

### `effect/unstable/cluster/ShardingRegistrationEvent.$match, EntityRegistered, SingletonRegistered`

- **Source:** `packages/effect/src/unstable/cluster/ShardingRegistrationEvent.ts:53`
- **Kind / category:** `root-declaration` / `pattern matching`
- **Priority:** **optional**
- **Current description:** Constructors and matchers for sharding registration events.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use `effect/unstable/cluster/ShardingRegistrationEvent.$match, EntityRegistered, SingletonRegistered` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cluster/ShardingRegistrationEvent.ShardingRegistrationEvent`

- **Source:** `packages/effect/src/unstable/cluster/ShardingRegistrationEvent.ts:20`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Represents events that can occur when a runner registers entities or singletons.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/cluster/ShardingRegistrationEvent.ShardingRegistrationEvent`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cluster/ShardingRegistrationEvent.EntityRegistered`

- **Source:** `packages/effect/src/unstable/cluster/ShardingRegistrationEvent.ts:30`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Represents an event that occurs when a new entity is registered with a runner.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/cluster/ShardingRegistrationEvent.EntityRegistered`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cluster/ShardingRegistrationEvent.SingletonRegistered`

- **Source:** `packages/effect/src/unstable/cluster/ShardingRegistrationEvent.ts:42`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Represents an event that occurs when a new singleton is registered with a runner.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/cluster/ShardingRegistrationEvent.SingletonRegistered`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.
