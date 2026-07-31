# Example Suggestions: `effect/unstable/ai/Tokenizer`

- **Package:** `effect`
- **Source:** `packages/effect/src/unstable/ai/Tokenizer.ts`
- **Uncovered API records:** 2
- **Priorities:** 0 required, 0 recommended, 2 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                             | Line | Kind     | Priority     |
| ----------------------------------------------- | ---: | -------- | ------------ |
| `effect/unstable/ai/Tokenizer.Service.tokenize` |   92 | `member` | **optional** |
| `effect/unstable/ai/Tokenizer.Service.truncate` |  101 | `member` | **optional** |

## Optional

### `effect/unstable/ai/Tokenizer.Service.tokenize`

- **Source:** `packages/effect/src/unstable/ai/Tokenizer.ts:92`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Converts text input into an array of token numbers.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Tokenizer.Service.tokenize` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/ai/Tokenizer.Service.truncate`

- **Source:** `packages/effect/src/unstable/ai/Tokenizer.ts:101`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Truncates text input to fit within the specified token limit.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/ai/Tokenizer.Service.truncate` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.
