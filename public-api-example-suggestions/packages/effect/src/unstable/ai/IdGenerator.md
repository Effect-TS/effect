# Example Suggestions: `effect/unstable/ai/IdGenerator`

- **Package:** `effect`
- **Source:** `packages/effect/src/unstable/ai/IdGenerator.ts`
- **Uncovered API records:** 4
- **Priorities:** 0 required, 0 recommended, 4 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                    | Line | Kind     | Priority     |
| ------------------------------------------------------ | ---: | -------- | ------------ |
| `effect/unstable/ai/IdGenerator.MakeOptions.alphabet`  |  120 | `member` | **optional** |
| `effect/unstable/ai/IdGenerator.MakeOptions.prefix`    |  124 | `member` | **optional** |
| `effect/unstable/ai/IdGenerator.MakeOptions.separator` |  128 | `member` | **optional** |
| `effect/unstable/ai/IdGenerator.MakeOptions.size`      |  132 | `member` | **optional** |

## Optional

### `effect/unstable/ai/IdGenerator.MakeOptions.alphabet`

- **Source:** `packages/effect/src/unstable/ai/IdGenerator.ts:120`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The character set to use for generating the random portion of IDs.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/IdGenerator.MakeOptions.alphabet` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/IdGenerator.MakeOptions.prefix`

- **Source:** `packages/effect/src/unstable/ai/IdGenerator.ts:124`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Optional prefix to prepend to generated IDs.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/IdGenerator.MakeOptions.prefix` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/IdGenerator.MakeOptions.separator`

- **Source:** `packages/effect/src/unstable/ai/IdGenerator.ts:128`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Character used to separate the prefix from the random portion.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/IdGenerator.MakeOptions.separator` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/IdGenerator.MakeOptions.size`

- **Source:** `packages/effect/src/unstable/ai/IdGenerator.ts:132`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Length of the random portion of the generated ID.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/IdGenerator.MakeOptions.size` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.
