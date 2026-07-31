# Example Suggestions: `effect/Inspectable`

- **Package:** `effect`
- **Source:** `packages/effect/src/Inspectable.ts`
- **Uncovered API records:** 5
- **Priorities:** 0 required, 0 recommended, 5 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                          | Line | Kind               | Priority     |
| -------------------------------------------- | ---: | ------------------ | ------------ |
| `effect/Inspectable.toJson`                  |  152 | `root-declaration` | **optional** |
| `effect/Inspectable.toStringUnknown`         |  185 | `root-declaration` | **optional** |
| `effect/Inspectable.Class.toJSON`            |  304 | `member`           | **optional** |
| `effect/Inspectable.Class.NodeInspectSymbol` |  314 | `member`           | **optional** |
| `effect/Inspectable.Class.toString`          |  326 | `member`           | **optional** |

## Optional

### `effect/Inspectable.toJson`

- **Source:** `packages/effect/src/Inspectable.ts:152`
- **Kind / category:** `root-declaration` / `converting`
- **Priority:** **optional**
- **Current description:** Converts a value to a JSON-serializable representation safely.
- **Signature hint:** `declare function toJson(input: unknown): unknown`
- **Import guidance:** Start from `import { Inspectable } from "effect"` and use `Inspectable.toJson`.
- **Suggested snippet:** Create a representative input through a public constructor, convert it with `Inspectable.toJson`, and assert a stable semantic output rather than console formatting or incidental metadata.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Inspectable.toStringUnknown`

- **Source:** `packages/effect/src/Inspectable.ts:185`
- **Kind / category:** `root-declaration` / `converting`
- **Priority:** **optional**
- **Current description:** Converts an unknown value to a string for diagnostics.
- **Signature hint:** `declare function toStringUnknown(u: unknown, whitespace?: number | string | undefined): string`
- **Import guidance:** Start from `import { Inspectable } from "effect"` and use `Inspectable.toStringUnknown`.
- **Suggested snippet:** Create a representative input through a public constructor, convert it with `Inspectable.toStringUnknown`, and assert a stable semantic output rather than console formatting or incidental metadata.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Inspectable.Class.toJSON`

- **Source:** `packages/effect/src/Inspectable.ts:304`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Returns a JSON representation of this object.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/Inspectable.Class.toJSON` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Inspectable.Class.NodeInspectSymbol`

- **Source:** `packages/effect/src/Inspectable.ts:314`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Node.js custom inspection method.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/Inspectable.Class.NodeInspectSymbol` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Inspectable.Class.toString`

- **Source:** `packages/effect/src/Inspectable.ts:326`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Returns a formatted string representation of this object.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/Inspectable.Class.toString` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.
