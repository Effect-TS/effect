# Example Suggestions: `effect/Utils`

- **Package:** `effect`
- **Source:** `packages/effect/src/Utils.ts`
- **Uncovered API records:** 2
- **Priorities:** 0 required, 0 recommended, 2 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                          | Line | Kind     | Priority     |
| -------------------------------------------- | ---: | -------- | ------------ |
| `effect/Utils.SingleShotGen.next`            |   66 | `member` | **optional** |
| `effect/Utils.SingleShotGen.Symbol.iterator` |   89 | `member` | **optional** |

## Optional

### `effect/Utils.SingleShotGen.next`

- **Source:** `packages/effect/src/Utils.ts:66`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Yields the stored value once, then completes with the value sent back in.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/Utils.SingleShotGen.next` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Utils.SingleShotGen.Symbol.iterator`

- **Source:** `packages/effect/src/Utils.ts:89`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Creates a fresh single-shot iterator over the stored value.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/Utils.SingleShotGen.Symbol.iterator` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.
