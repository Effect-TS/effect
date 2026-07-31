# Example Suggestions: `effect/unstable/cluster/Runner`

- **Package:** `effect`
- **Source:** `packages/effect/src/unstable/cluster/Runner.ts`
- **Uncovered API records:** 10
- **Priorities:** 0 required, 0 recommended, 9 optional, 1 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                       | Line | Kind               | Priority        |
| --------------------------------------------------------- | ---: | ------------------ | --------------- |
| `effect/unstable/cluster/Runner.make`                     |  125 | `root-declaration` | **optional**    |
| `effect/unstable/cluster/Runner.Runner`                   |   29 | `root-declaration` | **optional**    |
| `effect/unstable/cluster/Runner.Runner.format`            |   39 | `member`           | **optional**    |
| `effect/unstable/cluster/Runner.Runner.decodeSync`        |   53 | `member`           | **optional**    |
| `effect/unstable/cluster/Runner.Runner.encodeSync`        |   60 | `member`           | **optional**    |
| `effect/unstable/cluster/Runner.Runner.toString`          |   67 | `member`           | **optional**    |
| `effect/unstable/cluster/Runner.Runner.NodeInspectSymbol` |   76 | `member`           | **optional**    |
| `effect/unstable/cluster/Runner.Runner.Equal.symbol`      |   85 | `member`           | **optional**    |
| `effect/unstable/cluster/Runner.Runner.Hash.symbol`       |   94 | `member`           | **optional**    |
| `effect/unstable/cluster/Runner.Runner.TypeId`            |   46 | `member`           | **discouraged** |

## Optional

### `effect/unstable/cluster/Runner.make`

- **Source:** `packages/effect/src/unstable/cluster/Runner.ts:125`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Constructs a `Runner` from its network address, shard groups, and relative shard-assignment weight.
- **Signature hint:** `declare function make(props: { readonly address: RunnerAddress; readonly groups: ReadonlyArray<string>; readonly weight: number; }): Runner`
- **Import guidance:** Start from `import { Runner } from "effect/unstable/cluster"` and use `Runner.make`.
- **Suggested snippet:** Construct one representative value with `Runner.make`, then pass it to the smallest canonical getter, matcher, or runner that exposes what was created. Do not merely assert an object kind.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cluster/Runner.Runner`

- **Source:** `packages/effect/src/unstable/cluster/Runner.ts:29`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Represents a cluster runner that can host entities.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Runner } from "effect/unstable/cluster"` and use `Runner.Runner`.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `Runner.Runner`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cluster/Runner.Runner.format`

- **Source:** `packages/effect/src/unstable/cluster/Runner.ts:39`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Formatter for rendering runner values consistently.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/cluster/Runner.Runner.format` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cluster/Runner.Runner.decodeSync`

- **Source:** `packages/effect/src/unstable/cluster/Runner.ts:53`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Decodes a runner from its JSON string representation.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/cluster/Runner.Runner.decodeSync` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cluster/Runner.Runner.encodeSync`

- **Source:** `packages/effect/src/unstable/cluster/Runner.ts:60`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Encodes a runner to its JSON string representation.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/cluster/Runner.Runner.encodeSync` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cluster/Runner.Runner.toString`

- **Source:** `packages/effect/src/unstable/cluster/Runner.ts:67`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Formats this runner as a string.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/cluster/Runner.Runner.toString` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cluster/Runner.Runner.NodeInspectSymbol`

- **Source:** `packages/effect/src/unstable/cluster/Runner.ts:76`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Formats this runner for Node.js inspection.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/cluster/Runner.Runner.NodeInspectSymbol` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cluster/Runner.Runner.Equal.symbol`

- **Source:** `packages/effect/src/unstable/cluster/Runner.ts:85`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Compares runners by address and shard-assignment weight.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/cluster/Runner.Runner.Equal.symbol` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cluster/Runner.Runner.Hash.symbol`

- **Source:** `packages/effect/src/unstable/cluster/Runner.ts:94`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Computes a structural hash from the runner address and shard-assignment weight.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/cluster/Runner.Runner.Hash.symbol` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

## Discouraged

### `effect/unstable/cluster/Runner.Runner.TypeId`

- **Source:** `packages/effect/src/unstable/cluster/Runner.ts:46`
- **Kind / category:** `member` / `none`
- **Priority:** **discouraged**
- **Current description:** Marks this value as a cluster runner for runtime guards.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `effect/unstable/cluster/Runner.Runner.TypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.
