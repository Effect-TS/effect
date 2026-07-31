# Example Suggestions: `effect/Terminal`

- **Package:** `effect`
- **Source:** `packages/effect/src/Terminal.ts`
- **Uncovered API records:** 19
- **Priorities:** 0 required, 4 recommended, 14 optional, 1 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                         | Line | Kind               | Priority        |
| ------------------------------------------- | ---: | ------------------ | --------------- |
| `effect/Terminal.QuitError`                 |  124 | `root-declaration` | **recommended** |
| `effect/Terminal.isQuitError`               |  153 | `root-declaration` | **recommended** |
| `effect/Terminal.Terminal (value)`          |  166 | `root-declaration` | **recommended** |
| `effect/Terminal.make`                      |  186 | `root-declaration` | **recommended** |
| `effect/Terminal.Terminal (type)`           |   31 | `root-declaration` | **optional**    |
| `effect/Terminal.Terminal.columns`          |   37 | `member`           | **optional**    |
| `effect/Terminal.Terminal.rows`             |   42 | `member`           | **optional**    |
| `effect/Terminal.Terminal.readInput`        |   46 | `member`           | **optional**    |
| `effect/Terminal.Terminal.readLine`         |   50 | `member`           | **optional**    |
| `effect/Terminal.Terminal.display`          |   54 | `member`           | **optional**    |
| `effect/Terminal.Key`                       |   64 | `root-declaration` | **optional**    |
| `effect/Terminal.Key.name`                  |   68 | `member`           | **optional**    |
| `effect/Terminal.Key.ctrl`                  |   72 | `member`           | **optional**    |
| `effect/Terminal.Key.meta`                  |   76 | `member`           | **optional**    |
| `effect/Terminal.Key.shift`                 |   80 | `member`           | **optional**    |
| `effect/Terminal.UserInput`                 |   97 | `root-declaration` | **optional**    |
| `effect/Terminal.UserInput.input`           |  101 | `member`           | **optional**    |
| `effect/Terminal.UserInput.key`             |  105 | `member`           | **optional**    |
| `effect/Terminal.QuitError.QuitErrorTypeId` |  132 | `member`           | **discouraged** |

## Recommended

### `effect/Terminal.QuitError`

- **Source:** `packages/effect/src/Terminal.ts:124`
- **Kind / category:** `root-declaration` / `QuitError`
- **Priority:** **recommended**
- **Current description:** Represents an error that occurs when a user attempts to quit out of a `Terminal` prompt for input (usually by entering `ctrl`+`c`).
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Terminal } from "effect"` and use `Terminal.QuitError`.
- **Suggested snippet:** Create or capture `Terminal.QuitError` through the public operation that produces it, then assert its tag and one stable semantic field such as the input, path, or reason. Avoid stack traces and rendered message snapshots.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/Terminal.isQuitError`

- **Source:** `packages/effect/src/Terminal.ts:153`
- **Kind / category:** `root-declaration` / `guards`
- **Priority:** **recommended**
- **Current description:** Returns `true` if the provided value is a `Terminal.QuitError`.
- **Signature hint:** `declare function isQuitError(u: unknown): u is QuitError`
- **Import guidance:** Start from `import { Terminal } from "effect"` and use `Terminal.isQuitError`.
- **Suggested snippet:** Create one matching public value and one non-matching value accepted by the parameter type, call `Terminal.isQuitError` for both, and access a narrowed property in the true branch to demonstrate the type predicate.
- **Optional contrast:** Use one matching and one non-matching value from the accepted input domain.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/Terminal.Terminal (value)`

- **Source:** `packages/effect/src/Terminal.ts:166`
- **Kind / category:** `root-declaration` / `services`
- **Priority:** **recommended**
- **Current description:** Service tag for command-line input and output services.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { Terminal } from "effect"` and use `Terminal.Terminal`.
- **Suggested snippet:** Consume `Terminal.Terminal` from a small Effect, provide a deterministic test implementation or package-supported layer, run the program, and assert the service result without contacting external systems.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/Terminal.make`

- **Source:** `packages/effect/src/Terminal.ts:186`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Creates a `Terminal` service implementation.
- **Signature hint:** `declare function make(impl: Omit<Terminal, typeof TypeId>): Terminal`
- **Import guidance:** Start from `import { Terminal } from "effect"` and use `Terminal.make`.
- **Suggested snippet:** Construct one representative value with `Terminal.make`, then pass it to the smallest canonical getter, matcher, or runner that exposes what was created. Do not merely assert an object kind.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `effect/Terminal.Terminal (type)`

- **Source:** `packages/effect/src/Terminal.ts:31`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** A `Terminal` represents a command-line interface which can read input from a user and display messages to a user.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Terminal.Terminal`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Terminal.Terminal.columns`

- **Source:** `packages/effect/src/Terminal.ts:37`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The number of columns available on the platform's terminal interface.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/Terminal.Terminal.columns` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Terminal.Terminal.rows`

- **Source:** `packages/effect/src/Terminal.ts:42`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The number of rows available on the platform's terminal interface.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/Terminal.Terminal.rows` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Terminal.Terminal.readInput`

- **Source:** `packages/effect/src/Terminal.ts:46`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Reads input events from the default standard input.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/Terminal.Terminal.readInput` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Terminal.Terminal.readLine`

- **Source:** `packages/effect/src/Terminal.ts:50`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Reads a single line from the default standard input.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/Terminal.Terminal.readLine` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Terminal.Terminal.display`

- **Source:** `packages/effect/src/Terminal.ts:54`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Displays text to the default standard output.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/Terminal.Terminal.display` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Terminal.Key`

- **Source:** `packages/effect/src/Terminal.ts:64`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Keyboard key metadata for terminal input, including the key name and modifier state.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Terminal.Key`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Terminal.Key.name`

- **Source:** `packages/effect/src/Terminal.ts:68`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The name of the key being pressed.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/Terminal.Key.name` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Terminal.Key.ctrl`

- **Source:** `packages/effect/src/Terminal.ts:72`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** If set to `true`, then the user is also holding down the `Ctrl` key.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/Terminal.Key.ctrl` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Terminal.Key.meta`

- **Source:** `packages/effect/src/Terminal.ts:76`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** If set to `true`, then the user is also holding down the `Meta` key.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/Terminal.Key.meta` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Terminal.Key.shift`

- **Source:** `packages/effect/src/Terminal.ts:80`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** If set to `true`, then the user is also holding down the `Shift` key.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/Terminal.Key.shift` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Terminal.UserInput`

- **Source:** `packages/effect/src/Terminal.ts:97`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** A terminal input event containing an optional raw character and the parsed key that was pressed.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/Terminal.UserInput`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Add one invalid input only if the issue structure is part of the documented contract.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Terminal.UserInput.input`

- **Source:** `packages/effect/src/Terminal.ts:101`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The character read from the user (if any).
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/Terminal.UserInput.input` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/Terminal.UserInput.key`

- **Source:** `packages/effect/src/Terminal.ts:105`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The key that the user pressed.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/Terminal.UserInput.key` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

## Discouraged

### `effect/Terminal.QuitError.QuitErrorTypeId`

- **Source:** `packages/effect/src/Terminal.ts:132`
- **Kind / category:** `member` / `none`
- **Priority:** **discouraged**
- **Current description:** Marks this value as a terminal quit error for runtime guards.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `effect/Terminal.QuitError.QuitErrorTypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.
