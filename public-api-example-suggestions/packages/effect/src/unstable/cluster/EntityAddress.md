# Example Suggestions: `effect/unstable/cluster/EntityAddress`

- **Package:** `effect`
- **Source:** `packages/effect/src/unstable/cluster/EntityAddress.ts`
- **Uncovered API records:** 6
- **Priorities:** 0 required, 0 recommended, 5 optional, 1 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                                | Line | Kind               | Priority        |
| ------------------------------------------------------------------ | ---: | ------------------ | --------------- |
| `effect/unstable/cluster/EntityAddress.make`                       |   89 | `root-declaration` | **optional**    |
| `effect/unstable/cluster/EntityAddress.EntityAddress`              |   24 | `root-declaration` | **optional**    |
| `effect/unstable/cluster/EntityAddress.EntityAddress.toString`     |   41 | `member`           | **optional**    |
| `effect/unstable/cluster/EntityAddress.EntityAddress.Equal.symbol` |   50 | `member`           | **optional**    |
| `effect/unstable/cluster/EntityAddress.EntityAddress.Hash.symbol`  |   60 | `member`           | **optional**    |
| `effect/unstable/cluster/EntityAddress.EntityAddress.TypeId`       |   34 | `member`           | **discouraged** |

## Optional

### `effect/unstable/cluster/EntityAddress.make`

- **Source:** `packages/effect/src/unstable/cluster/EntityAddress.ts:89`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Constructs an `EntityAddress` from a shard ID, entity type, and entity ID.
- **Signature hint:** `declare function make(options: { readonly shardId: ShardId; readonly entityType: EntityType; readonly entityId: EntityId; }): EntityAddress`
- **Import guidance:** Start from `import { EntityAddress } from "effect/unstable/cluster"` and use `EntityAddress.make`.
- **Suggested snippet:** Construct one representative value with `EntityAddress.make`, then pass it to the smallest canonical getter, matcher, or runner that exposes what was created. Do not merely assert an object kind.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cluster/EntityAddress.EntityAddress`

- **Source:** `packages/effect/src/unstable/cluster/EntityAddress.ts:24`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Represents the unique address of an entity within the cluster.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { EntityAddress } from "effect/unstable/cluster"` and use `EntityAddress.EntityAddress`.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `EntityAddress.EntityAddress`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cluster/EntityAddress.EntityAddress.toString`

- **Source:** `packages/effect/src/unstable/cluster/EntityAddress.ts:41`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Formats the entity type, entity id, and shard id as a readable address.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/cluster/EntityAddress.EntityAddress.toString` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cluster/EntityAddress.EntityAddress.Equal.symbol`

- **Source:** `packages/effect/src/unstable/cluster/EntityAddress.ts:50`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Compares entity addresses by entity type, entity id, and shard id.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/cluster/EntityAddress.EntityAddress.Equal.symbol` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cluster/EntityAddress.EntityAddress.Hash.symbol`

- **Source:** `packages/effect/src/unstable/cluster/EntityAddress.ts:60`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Computes a structural hash from the entity type, entity id, and shard id.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/cluster/EntityAddress.EntityAddress.Hash.symbol` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

## Discouraged

### `effect/unstable/cluster/EntityAddress.EntityAddress.TypeId`

- **Source:** `packages/effect/src/unstable/cluster/EntityAddress.ts:34`
- **Kind / category:** `member` / `none`
- **Priority:** **discouraged**
- **Current description:** Marks this value as a cluster entity address for runtime guards.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `effect/unstable/cluster/EntityAddress.EntityAddress.TypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.
