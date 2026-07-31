# Example Suggestions: `effect/unstable/cluster/SingletonAddress`

- **Package:** `effect`
- **Source:** `packages/effect/src/unstable/cluster/SingletonAddress.ts`
- **Uncovered API records:** 4
- **Priorities:** 0 required, 0 recommended, 3 optional, 1 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                                      | Line | Kind               | Priority        |
| ------------------------------------------------------------------------ | ---: | ------------------ | --------------- |
| `effect/unstable/cluster/SingletonAddress.SingletonAddress`              |   23 | `root-declaration` | **optional**    |
| `effect/unstable/cluster/SingletonAddress.SingletonAddress.Hash.symbol`  |   38 | `member`           | **optional**    |
| `effect/unstable/cluster/SingletonAddress.SingletonAddress.Equal.symbol` |   46 | `member`           | **optional**    |
| `effect/unstable/cluster/SingletonAddress.SingletonAddress.TypeId`       |   32 | `member`           | **discouraged** |

## Optional

### `effect/unstable/cluster/SingletonAddress.SingletonAddress`

- **Source:** `packages/effect/src/unstable/cluster/SingletonAddress.ts:23`
- **Kind / category:** `root-declaration` / `address`
- **Priority:** **optional**
- **Current description:** Represents the unique address of an singleton within the cluster.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { SingletonAddress } from "effect/unstable/cluster"` and use `SingletonAddress.SingletonAddress`.
- **Suggested snippet:** Use `SingletonAddress.SingletonAddress` as the value, service tag, layer, schema, or configuration object documented by its declaration; do not call it as a function. Exercise it through the smallest public consumer and assert that consumer's semantic result.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cluster/SingletonAddress.SingletonAddress.Hash.symbol`

- **Source:** `packages/effect/src/unstable/cluster/SingletonAddress.ts:38`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Computes a structural hash from the singleton name and shard id.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/cluster/SingletonAddress.SingletonAddress.Hash.symbol` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cluster/SingletonAddress.SingletonAddress.Equal.symbol`

- **Source:** `packages/effect/src/unstable/cluster/SingletonAddress.ts:46`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Compares singleton addresses by name and shard id.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/cluster/SingletonAddress.SingletonAddress.Equal.symbol` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

## Discouraged

### `effect/unstable/cluster/SingletonAddress.SingletonAddress.TypeId`

- **Source:** `packages/effect/src/unstable/cluster/SingletonAddress.ts:32`
- **Kind / category:** `member` / `none`
- **Priority:** **discouraged**
- **Current description:** Marks this value as a cluster singleton address for runtime guards.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `effect/unstable/cluster/SingletonAddress.SingletonAddress.TypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.
