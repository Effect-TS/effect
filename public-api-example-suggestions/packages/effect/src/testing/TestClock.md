# Example Suggestions: `effect/testing/TestClock`

- **Package:** `effect`
- **Source:** `packages/effect/src/testing/TestClock.ts`
- **Uncovered API records:** 5
- **Priorities:** 0 required, 0 recommended, 5 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                       | Line | Kind                    | Priority     |
| --------------------------------------------------------- | ---: | ----------------------- | ------------ |
| `effect/testing/TestClock.TestClock.adjust`               |  100 | `member`                | **optional** |
| `effect/testing/TestClock.TestClock.setTime`              |  105 | `member`                | **optional** |
| `effect/testing/TestClock.TestClock.withLive`             |  110 | `member`                | **optional** |
| `effect/testing/TestClock.TestClock.Options.warningDelay` |  172 | `member`                | **optional** |
| `effect/testing/TestClock.TestClock.State`                |  183 | `namespace-declaration` | **optional** |

## Optional

### `effect/testing/TestClock.TestClock.adjust`

- **Source:** `packages/effect/src/testing/TestClock.ts:100`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Increments the current clock time by the specified duration. Any effects that were scheduled to occur on or before the new time will be run in order.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/testing/TestClock.TestClock.adjust` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/testing/TestClock.TestClock.setTime`

- **Source:** `packages/effect/src/testing/TestClock.ts:105`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Sets the current clock time to the specified `timestamp`. Any effects that were scheduled to occur on or before the new time will be run in order.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/testing/TestClock.TestClock.setTime` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/testing/TestClock.TestClock.withLive`

- **Source:** `packages/effect/src/testing/TestClock.ts:110`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Executes the specified effect with the live `Clock` instead of the `TestClock`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/testing/TestClock.TestClock.withLive` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/testing/TestClock.TestClock.Options.warningDelay`

- **Source:** `packages/effect/src/testing/TestClock.ts:172`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The amount of time to wait before displaying a warning message when a test is using time but is not advancing the `TestClock`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/testing/TestClock.TestClock.Options.warningDelay` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/testing/TestClock.TestClock.State`

- **Source:** `packages/effect/src/testing/TestClock.ts:183`
- **Kind / category:** `namespace-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Represents the state tracked by a `TestClock`, including the current millisecond timestamp and the sleeps scheduled to resume when the clock reaches their target time.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/testing/TestClock.TestClock.State`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.
