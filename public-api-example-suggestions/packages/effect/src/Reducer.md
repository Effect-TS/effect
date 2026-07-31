# Example Suggestions: `effect/Reducer`

- **Package:** `effect`
- **Source:** `packages/effect/src/Reducer.ts`
- **Uncovered API records:** 2
- **Priorities:** 0 required, 0 recommended, 2 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                   | Line | Kind     | Priority     |
| ------------------------------------- | ---: | -------- | ------------ |
| `effect/Reducer.Reducer.initialValue` |   62 | `member` | **optional** |
| `effect/Reducer.Reducer.combineAll`   |   71 | `member` | **optional** |

## Optional

### `effect/Reducer.Reducer.initialValue`

- **Source:** `packages/effect/src/Reducer.ts:62`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Neutral starting value (combining with this changes nothing).
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/Reducer.Reducer.initialValue` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Reducer.Reducer.combineAll`

- **Source:** `packages/effect/src/Reducer.ts:71`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Combines all values in the collection, starting from `initialValue`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/Reducer.Reducer.combineAll` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.
