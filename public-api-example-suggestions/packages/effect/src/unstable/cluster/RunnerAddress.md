# Example Suggestions: `effect/unstable/cluster/RunnerAddress`

- **Package:** `effect`
- **Source:** `packages/effect/src/unstable/cluster/RunnerAddress.ts`
- **Uncovered API records:** 8
- **Priorities:** 0 required, 0 recommended, 7 optional, 1 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                                     | Line | Kind               | Priority        |
| ----------------------------------------------------------------------- | ---: | ------------------ | --------------- |
| `effect/unstable/cluster/RunnerAddress.make`                            |  111 | `root-declaration` | **optional**    |
| `effect/unstable/cluster/RunnerAddress.RunnerAddress`                   |   29 | `root-declaration` | **optional**    |
| `effect/unstable/cluster/RunnerAddress.RunnerAddress.toString`          |   72 | `member`           | **optional**    |
| `effect/unstable/cluster/RunnerAddress.RunnerAddress.NodeInspectSymbol` |   81 | `member`           | **optional**    |
| `effect/unstable/cluster/RunnerAddress.RunnerAddress.Equal.symbol`      |   45 | `member`           | **optional**    |
| `effect/unstable/cluster/RunnerAddress.RunnerAddress.Hash.symbol`       |   54 | `member`           | **optional**    |
| `effect/unstable/cluster/RunnerAddress.RunnerAddress.PrimaryKey.symbol` |   63 | `member`           | **optional**    |
| `effect/unstable/cluster/RunnerAddress.RunnerAddress.TypeId`            |   38 | `member`           | **discouraged** |

## Optional

### `effect/unstable/cluster/RunnerAddress.make`

- **Source:** `packages/effect/src/unstable/cluster/RunnerAddress.ts:111`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Constructs a `RunnerAddress` from a host and port.
- **Signature hint:** `declare function make(host: string, port: number): RunnerAddress`
- **Import guidance:** Start from `import { RunnerAddress } from "effect/unstable/cluster"` and use `RunnerAddress.make`.
- **Suggested snippet:** Construct one representative value with `RunnerAddress.make`, then pass it to the smallest canonical getter, matcher, or runner that exposes what was created. Do not merely assert an object kind.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cluster/RunnerAddress.RunnerAddress`

- **Source:** `packages/effect/src/unstable/cluster/RunnerAddress.ts:29`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Represents the network address of a cluster runner, identified by host and port.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { RunnerAddress } from "effect/unstable/cluster"` and use `RunnerAddress.RunnerAddress`.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `RunnerAddress.RunnerAddress`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cluster/RunnerAddress.RunnerAddress.toString`

- **Source:** `packages/effect/src/unstable/cluster/RunnerAddress.ts:72`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Formats the runner address with its host and port.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/cluster/RunnerAddress.RunnerAddress.toString` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cluster/RunnerAddress.RunnerAddress.NodeInspectSymbol`

- **Source:** `packages/effect/src/unstable/cluster/RunnerAddress.ts:81`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Formats the runner address for Node.js inspection.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/cluster/RunnerAddress.RunnerAddress.NodeInspectSymbol` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cluster/RunnerAddress.RunnerAddress.Equal.symbol`

- **Source:** `packages/effect/src/unstable/cluster/RunnerAddress.ts:45`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Compares runner addresses by host and port.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/cluster/RunnerAddress.RunnerAddress.Equal.symbol` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cluster/RunnerAddress.RunnerAddress.Hash.symbol`

- **Source:** `packages/effect/src/unstable/cluster/RunnerAddress.ts:54`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Computes a structural hash from the host and port.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/cluster/RunnerAddress.RunnerAddress.Hash.symbol` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cluster/RunnerAddress.RunnerAddress.PrimaryKey.symbol`

- **Source:** `packages/effect/src/unstable/cluster/RunnerAddress.ts:63`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Stable primary key used to identify the runner address.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/cluster/RunnerAddress.RunnerAddress.PrimaryKey.symbol` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

## Discouraged

### `effect/unstable/cluster/RunnerAddress.RunnerAddress.TypeId`

- **Source:** `packages/effect/src/unstable/cluster/RunnerAddress.ts:38`
- **Kind / category:** `member` / `none`
- **Priority:** **discouraged**
- **Current description:** Marks this value as a cluster runner address for runtime guards.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `effect/unstable/cluster/RunnerAddress.RunnerAddress.TypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.
