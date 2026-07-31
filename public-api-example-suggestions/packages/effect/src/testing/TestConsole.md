# Example Suggestions: `effect/testing/TestConsole`

- **Package:** `effect`
- **Source:** `packages/effect/src/testing/TestConsole.ts`
- **Uncovered API records:** 3
- **Priorities:** 0 required, 0 recommended, 3 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                 | Line | Kind        | Priority     |
| --------------------------------------------------- | ---: | ----------- | ------------ |
| `effect/testing/TestConsole.TestConsole.logLines`   |   69 | `member`    | **optional** |
| `effect/testing/TestConsole.TestConsole.errorLines` |   79 | `member`    | **optional** |
| `effect/testing/TestConsole.TestConsole`            |   92 | `namespace` | **optional** |

## Optional

### `effect/testing/TestConsole.TestConsole.logLines`

- **Source:** `packages/effect/src/testing/TestConsole.ts:69`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Returns an array of all items that have been logged by the program using `Console.log` thus far.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/testing/TestConsole.TestConsole.logLines` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/testing/TestConsole.TestConsole.errorLines`

- **Source:** `packages/effect/src/testing/TestConsole.ts:79`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Returns an array of all items that have been logged by the program using `Console.error` thus far.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/testing/TestConsole.TestConsole.errorLines` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/testing/TestConsole.TestConsole`

- **Source:** `packages/effect/src/testing/TestConsole.ts:92`
- **Kind / category:** `namespace` / `none`
- **Priority:** **optional**
- **Current description:** The `TestConsole` namespace provides types and utilities for working with test console implementations.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/testing/TestConsole.TestConsole`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.
