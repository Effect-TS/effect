# Example Suggestions: `effect/unstable/cli/Prompt`

- **Package:** `effect`
- **Source:** `packages/effect/src/unstable/cli/Prompt.ts`
- **Uncovered API records:** 100
- **Priorities:** 0 required, 5 recommended, 95 optional, 0 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                                    | Line | Kind                    | Priority        |
| ---------------------------------------------------------------------- | ---: | ----------------------- | --------------- |
| `effect/unstable/cli/Prompt.isPrompt`                                  |   63 | `root-declaration`      | **recommended** |
| `effect/unstable/cli/Prompt.custom`                                    |  787 | `root-declaration`      | **recommended** |
| `effect/unstable/cli/Prompt.flatMap`                                   |  920 | `root-declaration`      | **recommended** |
| `effect/unstable/cli/Prompt.map`                                       | 1052 | `root-declaration`      | **recommended** |
| `effect/unstable/cli/Prompt.run`                                       | 1088 | `root-declaration`      | **recommended** |
| `effect/unstable/cli/Prompt.ConfirmOptions`                            |  157 | `root-declaration`      | **optional**    |
| `effect/unstable/cli/Prompt.DateOptions`                               |  203 | `root-declaration`      | **optional**    |
| `effect/unstable/cli/Prompt.IntegerOptions`                            |  278 | `root-declaration`      | **optional**    |
| `effect/unstable/cli/Prompt.FloatOptions`                              |  323 | `root-declaration`      | **optional**    |
| `effect/unstable/cli/Prompt.ListOptions`                               |  337 | `root-declaration`      | **optional**    |
| `effect/unstable/cli/Prompt.FileOptions`                               |  355 | `root-declaration`      | **optional**    |
| `effect/unstable/cli/Prompt.SelectOptions`                             |  391 | `root-declaration`      | **optional**    |
| `effect/unstable/cli/Prompt.AutoCompleteOptions`                       |  413 | `root-declaration`      | **optional**    |
| `effect/unstable/cli/Prompt.MultiSelectOptions`                        |  435 | `root-declaration`      | **optional**    |
| `effect/unstable/cli/Prompt.TextOptions`                               |  496 | `root-declaration`      | **optional**    |
| `effect/unstable/cli/Prompt.ToggleOptions`                             |  519 | `root-declaration`      | **optional**    |
| `effect/unstable/cli/Prompt.confirm`                                   |  742 | `root-declaration`      | **optional**    |
| `effect/unstable/cli/Prompt.date`                                      |  837 | `root-declaration`      | **optional**    |
| `effect/unstable/cli/Prompt.file`                                      |  875 | `root-declaration`      | **optional**    |
| `effect/unstable/cli/Prompt.float`                                     |  950 | `root-declaration`      | **optional**    |
| `effect/unstable/cli/Prompt.hidden`                                    |  988 | `root-declaration`      | **optional**    |
| `effect/unstable/cli/Prompt.integer`                                   | 1003 | `root-declaration`      | **optional**    |
| `effect/unstable/cli/Prompt.list`                                      | 1041 | `root-declaration`      | **optional**    |
| `effect/unstable/cli/Prompt.password`                                  | 1072 | `root-declaration`      | **optional**    |
| `effect/unstable/cli/Prompt.select`                                    | 1133 | `root-declaration`      | **optional**    |
| `effect/unstable/cli/Prompt.multiSelect`                               | 1208 | `root-declaration`      | **optional**    |
| `effect/unstable/cli/Prompt.succeed`                                   | 1242 | `root-declaration`      | **optional**    |
| `effect/unstable/cli/Prompt.text`                                      | 1256 | `root-declaration`      | **optional**    |
| `effect/unstable/cli/Prompt.toggle`                                    | 1267 | `root-declaration`      | **optional**    |
| `effect/unstable/cli/Prompt.Prompt`                                    |   51 | `root-declaration`      | **optional**    |
| `effect/unstable/cli/Prompt.Environment`                               |   71 | `root-declaration`      | **optional**    |
| `effect/unstable/cli/Prompt.Action`                                    |   80 | `root-declaration`      | **optional**    |
| `effect/unstable/cli/Prompt.ActionDefinition`                          |   97 | `root-declaration`      | **optional**    |
| `effect/unstable/cli/Prompt.ProcessInput`                              |  108 | `root-declaration`      | **optional**    |
| `effect/unstable/cli/Prompt.Handlers`                                  |  124 | `root-declaration`      | **optional**    |
| `effect/unstable/cli/Prompt.Handlers.render`                           |  128 | `member`                | **optional**    |
| `effect/unstable/cli/Prompt.Handlers.process`                          |  136 | `member`                | **optional**    |
| `effect/unstable/cli/Prompt.Handlers.clear`                            |  144 | `member`                | **optional**    |
| `effect/unstable/cli/Prompt.ConfirmOptions.message`                    |  161 | `member`                | **optional**    |
| `effect/unstable/cli/Prompt.ConfirmOptions.initial`                    |  165 | `member`                | **optional**    |
| `effect/unstable/cli/Prompt.ConfirmOptions.label`                      |  169 | `member`                | **optional**    |
| `effect/unstable/cli/Prompt.ConfirmOptions.label.confirm`              |  173 | `member`                | **optional**    |
| `effect/unstable/cli/Prompt.ConfirmOptions.label.deny`                 |  177 | `member`                | **optional**    |
| `effect/unstable/cli/Prompt.ConfirmOptions.placeholder`                |  182 | `member`                | **optional**    |
| `effect/unstable/cli/Prompt.ConfirmOptions.placeholder.defaultConfirm` |  187 | `member`                | **optional**    |
| `effect/unstable/cli/Prompt.ConfirmOptions.placeholder.defaultDeny`    |  192 | `member`                | **optional**    |
| `effect/unstable/cli/Prompt.DateOptions.message`                       |  207 | `member`                | **optional**    |
| `effect/unstable/cli/Prompt.DateOptions.initial`                       |  212 | `member`                | **optional**    |
| `effect/unstable/cli/Prompt.DateOptions.dateMask`                      |  216 | `member`                | **optional**    |
| `effect/unstable/cli/Prompt.DateOptions.validate`                      |  221 | `member`                | **optional**    |
| `effect/unstable/cli/Prompt.DateOptions.locales`                       |  225 | `member`                | **optional**    |
| `effect/unstable/cli/Prompt.DateOptions.locales.months`                |  229 | `member`                | **optional**    |
| `effect/unstable/cli/Prompt.DateOptions.locales.monthsShort`           |  246 | `member`                | **optional**    |
| `effect/unstable/cli/Prompt.DateOptions.locales.weekdays`              |  263 | `member`                | **optional**    |
| `effect/unstable/cli/Prompt.DateOptions.locales.weekdaysShort`         |  267 | `member`                | **optional**    |
| `effect/unstable/cli/Prompt.IntegerOptions.message`                    |  282 | `member`                | **optional**    |
| `effect/unstable/cli/Prompt.IntegerOptions.default`                    |  286 | `member`                | **optional**    |
| `effect/unstable/cli/Prompt.IntegerOptions.min`                        |  290 | `member`                | **optional**    |
| `effect/unstable/cli/Prompt.IntegerOptions.max`                        |  294 | `member`                | **optional**    |
| `effect/unstable/cli/Prompt.IntegerOptions.incrementBy`                |  299 | `member`                | **optional**    |
| `effect/unstable/cli/Prompt.IntegerOptions.decrementBy`                |  304 | `member`                | **optional**    |
| `effect/unstable/cli/Prompt.IntegerOptions.validate`                   |  309 | `member`                | **optional**    |
| `effect/unstable/cli/Prompt.FloatOptions.precision`                    |  327 | `member`                | **optional**    |
| `effect/unstable/cli/Prompt.ListOptions.delimiter`                     |  341 | `member`                | **optional**    |
| `effect/unstable/cli/Prompt.FileOptions.type`                          |  359 | `member`                | **optional**    |
| `effect/unstable/cli/Prompt.FileOptions.message`                       |  363 | `member`                | **optional**    |
| `effect/unstable/cli/Prompt.FileOptions.startingPath`                  |  368 | `member`                | **optional**    |
| `effect/unstable/cli/Prompt.FileOptions.default`                       |  372 | `member`                | **optional**    |
| `effect/unstable/cli/Prompt.FileOptions.maxPerPage`                    |  376 | `member`                | **optional**    |
| `effect/unstable/cli/Prompt.FileOptions.filter`                        |  381 | `member`                | **optional**    |
| `effect/unstable/cli/Prompt.SelectOptions.message`                     |  395 | `member`                | **optional**    |
| `effect/unstable/cli/Prompt.SelectOptions.choices`                     |  399 | `member`                | **optional**    |
| `effect/unstable/cli/Prompt.SelectOptions.maxPerPage`                  |  403 | `member`                | **optional**    |
| `effect/unstable/cli/Prompt.AutoCompleteOptions.filterLabel`           |  417 | `member`                | **optional**    |
| `effect/unstable/cli/Prompt.AutoCompleteOptions.filterPlaceholder`     |  421 | `member`                | **optional**    |
| `effect/unstable/cli/Prompt.AutoCompleteOptions.emptyMessage`          |  425 | `member`                | **optional**    |
| `effect/unstable/cli/Prompt.MultiSelectOptions.selectAll`              |  439 | `member`                | **optional**    |
| `effect/unstable/cli/Prompt.MultiSelectOptions.selectNone`             |  443 | `member`                | **optional**    |
| `effect/unstable/cli/Prompt.MultiSelectOptions.inverseSelection`       |  447 | `member`                | **optional**    |
| `effect/unstable/cli/Prompt.MultiSelectOptions.min`                    |  451 | `member`                | **optional**    |
| `effect/unstable/cli/Prompt.MultiSelectOptions.max`                    |  455 | `member`                | **optional**    |
| `effect/unstable/cli/Prompt.SelectChoice`                              |  465 | `root-declaration`      | **optional**    |
| `effect/unstable/cli/Prompt.SelectChoice.title`                        |  469 | `member`                | **optional**    |
| `effect/unstable/cli/Prompt.SelectChoice.value`                        |  473 | `member`                | **optional**    |
| `effect/unstable/cli/Prompt.SelectChoice.description`                  |  478 | `member`                | **optional**    |
| `effect/unstable/cli/Prompt.SelectChoice.disabled`                     |  482 | `member`                | **optional**    |
| `effect/unstable/cli/Prompt.SelectChoice.selected`                     |  486 | `member`                | **optional**    |
| `effect/unstable/cli/Prompt.TextOptions.message`                       |  500 | `member`                | **optional**    |
| `effect/unstable/cli/Prompt.TextOptions.default`                       |  504 | `member`                | **optional**    |
| `effect/unstable/cli/Prompt.TextOptions.validate`                      |  509 | `member`                | **optional**    |
| `effect/unstable/cli/Prompt.ToggleOptions.message`                     |  523 | `member`                | **optional**    |
| `effect/unstable/cli/Prompt.ToggleOptions.initial`                     |  527 | `member`                | **optional**    |
| `effect/unstable/cli/Prompt.ToggleOptions.active`                      |  532 | `member`                | **optional**    |
| `effect/unstable/cli/Prompt.ToggleOptions.inactive`                    |  537 | `member`                | **optional**    |
| `effect/unstable/cli/Prompt.Any`                                       |  586 | `root-declaration`      | **optional**    |
| `effect/unstable/cli/Prompt.All`                                       |  593 | `namespace`             | **optional**    |
| `effect/unstable/cli/Prompt.All.ReturnIterable`                        |  604 | `namespace-declaration` | **optional**    |
| `effect/unstable/cli/Prompt.All.ReturnTuple`                           |  614 | `namespace-declaration` | **optional**    |
| `effect/unstable/cli/Prompt.All.ReturnObject`                          |  626 | `namespace-declaration` | **optional**    |
| `effect/unstable/cli/Prompt.All.Return`                                |  640 | `namespace-declaration` | **optional**    |

## Recommended

### `effect/unstable/cli/Prompt.isPrompt`

- **Source:** `packages/effect/src/unstable/cli/Prompt.ts:63`
- **Kind / category:** `root-declaration` / `guards`
- **Priority:** **recommended**
- **Current description:** Returns `true` if the provided value is a `Prompt`.
- **Signature hint:** `declare function isPrompt(u: unknown): u is Prompt<unknown>`
- **Import guidance:** Start from `import { Prompt } from "effect/unstable/cli"` and use `Prompt.isPrompt`.
- **Suggested snippet:** Create one matching public value and one non-matching value accepted by the parameter type, call `Prompt.isPrompt` for both, and access a narrowed property in the true branch to demonstrate the type predicate.
- **Optional contrast:** Use one matching and one non-matching value from the accepted input domain.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/cli/Prompt.custom`

- **Source:** `packages/effect/src/unstable/cli/Prompt.ts:787`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **recommended**
- **Current description:** Creates a custom `Prompt` from the specified initial state and handlers.
- **Signature hint:** `declare function custom<State, Output>(initialState: State | Effect.Effect<State, never, Environment>, handlers: Handlers<State, Output>): Prompt<Output>`
- **Import guidance:** Start from `import { Prompt } from "effect/unstable/cli"` and use `Prompt.custom`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Creates a custom `Prompt` from the specified initial state and handlers. Call `Prompt.custom` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/cli/Prompt.flatMap`

- **Source:** `packages/effect/src/unstable/cli/Prompt.ts:920`
- **Kind / category:** `root-declaration` / `combinators`
- **Priority:** **recommended**
- **Current description:** Composes prompts by using the output of this prompt to create the next prompt.
- **Signature hint:** `declare function flatMap<Output, Output2>(f: (output: Output) => Prompt<Output2>): (self: Prompt<Output>) => Prompt<Output2> declare function flatMap<Output, Output2>(self: Prompt<Output>, f: (output: Output) => Prompt<Output2>): Prompt<Output2>`
- **Import guidance:** Start from `import { Prompt } from "effect/unstable/cli"` and use `Prompt.flatMap`.
- **Suggested snippet:** Apply `Prompt.flatMap` to a minimal value with a transformation that visibly changes the result, then assert the complete semantic output. Add a second case only for a documented empty or failure distinction.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/cli/Prompt.map`

- **Source:** `packages/effect/src/unstable/cli/Prompt.ts:1052`
- **Kind / category:** `root-declaration` / `combinators`
- **Priority:** **recommended**
- **Current description:** Transforms the output value produced by a prompt.
- **Signature hint:** `declare function map<Output, Output2>(f: (output: Output) => Output2): (self: Prompt<Output>) => Prompt<Output2> declare function map<Output, Output2>(self: Prompt<Output>, f: (output: Output) => Output2): Prompt<Output2>`
- **Import guidance:** Start from `import { Prompt } from "effect/unstable/cli"` and use `Prompt.map`.
- **Suggested snippet:** Apply `Prompt.map` to a minimal value with a transformation that visibly changes the result, then assert the complete semantic output. Add a second case only for a documented empty or failure distinction.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

### `effect/unstable/cli/Prompt.run`

- **Source:** `packages/effect/src/unstable/cli/Prompt.ts:1088`
- **Kind / category:** `root-declaration` / `execution`
- **Priority:** **recommended**
- **Current description:** Runs a prompt by reading terminal input and rendering prompt frames until the prompt submits a value.
- **Signature hint:** `declare function run<Output>(self: Prompt<Output>): Effect.Effect<Output, Terminal.QuitError, Environment>`
- **Import guidance:** Start from `import { Prompt } from "effect/unstable/cli"` and use `Prompt.run`.
- **Suggested snippet:** Build the smallest deterministic Effect that exposes the documented behavior of `Prompt.run`, execute it explicitly, and assert its semantic success value or captured failure.
- **Future-agent advice:** Confirm the scenario in tests or production call sites, keep the documented API central, and remove unrelated setup.

## Optional

### `effect/unstable/cli/Prompt.ConfirmOptions`

- **Source:** `packages/effect/src/unstable/cli/Prompt.ts:157`
- **Kind / category:** `root-declaration` / `options`
- **Priority:** **optional**
- **Current description:** Options for a confirmation prompt that asks the user to choose a boolean yes/no value.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/cli/Prompt.ConfirmOptions`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/Prompt.DateOptions`

- **Source:** `packages/effect/src/unstable/cli/Prompt.ts:203`
- **Kind / category:** `root-declaration` / `options`
- **Priority:** **optional**
- **Current description:** Options for a date prompt, including the displayed message, initial value, format mask, validation, and locale labels.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/cli/Prompt.DateOptions`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/Prompt.IntegerOptions`

- **Source:** `packages/effect/src/unstable/cli/Prompt.ts:278`
- **Kind / category:** `root-declaration` / `options`
- **Priority:** **optional**
- **Current description:** Options for an integer prompt, including bounds, keyboard step sizes, and additional validation.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/cli/Prompt.IntegerOptions`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/Prompt.FloatOptions`

- **Source:** `packages/effect/src/unstable/cli/Prompt.ts:323`
- **Kind / category:** `root-declaration` / `options`
- **Priority:** **optional**
- **Current description:** Options for a floating-point number prompt.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/cli/Prompt.FloatOptions`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/Prompt.ListOptions`

- **Source:** `packages/effect/src/unstable/cli/Prompt.ts:337`
- **Kind / category:** `root-declaration` / `options`
- **Priority:** **optional**
- **Current description:** Options for a text prompt that returns a list of strings by splitting the input on a delimiter.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/cli/Prompt.ListOptions`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/Prompt.FileOptions`

- **Source:** `packages/effect/src/unstable/cli/Prompt.ts:355`
- **Kind / category:** `root-declaration` / `options`
- **Priority:** **optional**
- **Current description:** Options for a file-system selection prompt.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/cli/Prompt.FileOptions`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/Prompt.SelectOptions`

- **Source:** `packages/effect/src/unstable/cli/Prompt.ts:391`
- **Kind / category:** `root-declaration` / `options`
- **Priority:** **optional**
- **Current description:** Options for a prompt that asks the user to select one value from a list of choices.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/cli/Prompt.SelectOptions`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/Prompt.AutoCompleteOptions`

- **Source:** `packages/effect/src/unstable/cli/Prompt.ts:413`
- **Kind / category:** `root-declaration` / `options`
- **Priority:** **optional**
- **Current description:** Options for an autocomplete prompt that lets the user filter selectable choices by typing.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/cli/Prompt.AutoCompleteOptions`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/Prompt.MultiSelectOptions`

- **Source:** `packages/effect/src/unstable/cli/Prompt.ts:435`
- **Kind / category:** `root-declaration` / `options`
- **Priority:** **optional**
- **Current description:** Options for a multi-select prompt, including bulk-selection labels and minimum or maximum selection counts.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/cli/Prompt.MultiSelectOptions`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/Prompt.TextOptions`

- **Source:** `packages/effect/src/unstable/cli/Prompt.ts:496`
- **Kind / category:** `root-declaration` / `options`
- **Priority:** **optional**
- **Current description:** Options for text-entry prompts, including the displayed message, default text, and effectful validation before submission.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/cli/Prompt.TextOptions`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/Prompt.ToggleOptions`

- **Source:** `packages/effect/src/unstable/cli/Prompt.ts:519`
- **Kind / category:** `root-declaration` / `options`
- **Priority:** **optional**
- **Current description:** Options for a toggle prompt that lets the user switch between active and inactive boolean states.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/cli/Prompt.ToggleOptions`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/Prompt.confirm`

- **Source:** `packages/effect/src/unstable/cli/Prompt.ts:742`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Creates a confirmation prompt that asks the user to choose a boolean yes/no value.
- **Signature hint:** `declare function confirm(options: ConfirmOptions): Prompt<boolean>`
- **Import guidance:** Start from `import { Prompt } from "effect/unstable/cli"` and use `Prompt.confirm`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Creates a confirmation prompt that asks the user to choose a boolean yes/no value. Call `Prompt.confirm` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/Prompt.date`

- **Source:** `packages/effect/src/unstable/cli/Prompt.ts:837`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Creates a date prompt that lets the user edit a formatted date value and validates the final `Date` before submission.
- **Signature hint:** `declare function date(options: DateOptions): Prompt<Date>`
- **Import guidance:** Start from `import { Prompt } from "effect/unstable/cli"` and use `Prompt.date`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Creates a date prompt that lets the user edit a formatted date value and validates the final `Date` before submission. Call `Prompt.date` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/Prompt.file`

- **Source:** `packages/effect/src/unstable/cli/Prompt.ts:875`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Creates a file-system selection prompt and returns the selected path.
- **Signature hint:** `declare function file(options?: FileOptions): Prompt<string>`
- **Import guidance:** Start from `import { Prompt } from "effect/unstable/cli"` and use `Prompt.file`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Creates a file-system selection prompt and returns the selected path. Call `Prompt.file` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/Prompt.float`

- **Source:** `packages/effect/src/unstable/cli/Prompt.ts:950`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Creates a floating-point number prompt.
- **Signature hint:** `declare function float(options: FloatOptions): Prompt<number>`
- **Import guidance:** Start from `import { Prompt } from "effect/unstable/cli"` and use `Prompt.float`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Creates a floating-point number prompt. Call `Prompt.float` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/Prompt.hidden`

- **Source:** `packages/effect/src/unstable/cli/Prompt.ts:988`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Creates a text prompt that does not echo typed input and returns the submitted value wrapped in `Redacted`.
- **Signature hint:** `declare function hidden(options: TextOptions): Prompt<Redacted.Redacted>`
- **Import guidance:** Start from `import { Prompt } from "effect/unstable/cli"` and use `Prompt.hidden`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Creates a text prompt that does not echo typed input and returns the submitted value wrapped in `Redacted`. Call `Prompt.hidden` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/Prompt.integer`

- **Source:** `packages/effect/src/unstable/cli/Prompt.ts:1003`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Creates an integer prompt.
- **Signature hint:** `declare function integer(options: IntegerOptions): Prompt<number>`
- **Import guidance:** Start from `import { Prompt } from "effect/unstable/cli"` and use `Prompt.integer`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Creates an integer prompt. Call `Prompt.integer` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/Prompt.list`

- **Source:** `packages/effect/src/unstable/cli/Prompt.ts:1041`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Creates a text prompt that returns an array of strings by splitting the submitted input on the configured delimiter.
- **Signature hint:** `declare function list(options: ListOptions): Prompt<Array<string>>`
- **Import guidance:** Start from `import { Prompt } from "effect/unstable/cli"` and use `Prompt.list`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Creates a text prompt that returns an array of strings by splitting the submitted input on the configured delimiter. Call `Prompt.list` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/Prompt.password`

- **Source:** `packages/effect/src/unstable/cli/Prompt.ts:1072`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Creates a password prompt that masks typed input and returns the submitted value wrapped in `Redacted`.
- **Signature hint:** `declare function password(options: TextOptions): Prompt<Redacted.Redacted>`
- **Import guidance:** Start from `import { Prompt } from "effect/unstable/cli"` and use `Prompt.password`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Creates a password prompt that masks typed input and returns the submitted value wrapped in `Redacted`. Call `Prompt.password` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/Prompt.select`

- **Source:** `packages/effect/src/unstable/cli/Prompt.ts:1133`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Creates a prompt that lets the user select a single value from a list of choices.
- **Signature hint:** `declare function select<const A>(options: SelectOptions<A>): Prompt<A>`
- **Import guidance:** Start from `import { Prompt } from "effect/unstable/cli"` and use `Prompt.select`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Creates a prompt that lets the user select a single value from a list of choices. Call `Prompt.select` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/Prompt.multiSelect`

- **Source:** `packages/effect/src/unstable/cli/Prompt.ts:1208`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Creates a prompt that lets the user select multiple choices and returns their values as an array.
- **Signature hint:** `declare function multiSelect<const A>(options: SelectOptions<A> & MultiSelectOptions): Prompt<Array<A>>`
- **Import guidance:** Start from `import { Prompt } from "effect/unstable/cli"` and use `Prompt.multiSelect`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Creates a prompt that lets the user select multiple choices and returns their values as an array. Call `Prompt.multiSelect` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/Prompt.succeed`

- **Source:** `packages/effect/src/unstable/cli/Prompt.ts:1242`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Creates a `Prompt` which immediately succeeds with the specified value.
- **Signature hint:** `declare function succeed<A>(value: A): Prompt<A>`
- **Import guidance:** Start from `import { Prompt } from "effect/unstable/cli"` and use `Prompt.succeed`.
- **Suggested snippet:** Construct one representative value with `Prompt.succeed`, then pass it to the smallest canonical getter, matcher, or runner that exposes what was created. Do not merely assert an object kind.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/Prompt.text`

- **Source:** `packages/effect/src/unstable/cli/Prompt.ts:1256`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Creates a text-entry prompt that echoes input and returns the submitted string after validation.
- **Signature hint:** `declare function text(options: TextOptions): Prompt<string>`
- **Import guidance:** Start from `import { Prompt } from "effect/unstable/cli"` and use `Prompt.text`.
- **Suggested snippet:** Set up the smallest public input needed to demonstrate this contract: Creates a text-entry prompt that echoes input and returns the submitted string after validation. Call `Prompt.text` directly and assert one stable semantic result; add a boundary case only when repository tests show a non-obvious distinction.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/Prompt.toggle`

- **Source:** `packages/effect/src/unstable/cli/Prompt.ts:1267`
- **Kind / category:** `root-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Creates a toggle prompt that lets the user switch between active and inactive states and returns the selected boolean value.
- **Signature hint:** `declare function toggle(options: ToggleOptions): Prompt<boolean>`
- **Import guidance:** Start from `import { Prompt } from "effect/unstable/cli"` and use `Prompt.toggle`.
- **Suggested snippet:** Create a representative input through a public constructor, convert it with `Prompt.toggle`, and assert a stable semantic output rather than console formatting or incidental metadata.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/Prompt.Prompt`

- **Source:** `packages/effect/src/unstable/cli/Prompt.ts:51`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Represents an interactive terminal prompt that produces an `Output` value.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/cli/Prompt.Prompt`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/Prompt.Environment`

- **Source:** `packages/effect/src/unstable/cli/Prompt.ts:71`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Represents the services available to a custom `Prompt`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/cli/Prompt.Environment`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/Prompt.Action`

- **Source:** `packages/effect/src/unstable/cli/Prompt.ts:80`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Represents the action that should be taken by a `Prompt` based upon user input or an external event received during the current frame.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/cli/Prompt.Action`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/Prompt.ActionDefinition`

- **Source:** `packages/effect/src/unstable/cli/Prompt.ts:97`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Type-level definition for the tagged `Prompt.Action` variants.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/cli/Prompt.ActionDefinition`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/Prompt.ProcessInput`

- **Source:** `packages/effect/src/unstable/cli/Prompt.ts:108`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Represents the input that should be processed by a `Prompt` based upon user input or an external event received during the current frame.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/cli/Prompt.ProcessInput`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/Prompt.Handlers`

- **Source:** `packages/effect/src/unstable/cli/Prompt.ts:124`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Represents the set of handlers used by a `Prompt`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/cli/Prompt.Handlers`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/Prompt.Handlers.render`

- **Source:** `packages/effect/src/unstable/cli/Prompt.ts:128`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** A function that is called to render the current frame of the `Prompt`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/cli/Prompt.Handlers.render` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/Prompt.Handlers.process`

- **Source:** `packages/effect/src/unstable/cli/Prompt.ts:136`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** A function that is called to process user input and determine the next `Prompt.Action` that should be taken.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/cli/Prompt.Handlers.process` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/Prompt.Handlers.clear`

- **Source:** `packages/effect/src/unstable/cli/Prompt.ts:144`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** A function that is called to clear the terminal screen before rendering the next frame of the `Prompt`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/cli/Prompt.Handlers.clear` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/Prompt.ConfirmOptions.message`

- **Source:** `packages/effect/src/unstable/cli/Prompt.ts:161`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The message to display in the prompt.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/cli/Prompt.ConfirmOptions.message` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/Prompt.ConfirmOptions.initial`

- **Source:** `packages/effect/src/unstable/cli/Prompt.ts:165`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The initial value of the confirm prompt (defaults to `false`).
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/cli/Prompt.ConfirmOptions.initial` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/Prompt.ConfirmOptions.label`

- **Source:** `packages/effect/src/unstable/cli/Prompt.ts:169`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The label to display after a user has responded to the prompt.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/cli/Prompt.ConfirmOptions.label` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/Prompt.ConfirmOptions.label.confirm`

- **Source:** `packages/effect/src/unstable/cli/Prompt.ts:173`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The label used if the prompt is confirmed (defaults to `"yes"`).
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/cli/Prompt.ConfirmOptions.label.confirm` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/Prompt.ConfirmOptions.label.deny`

- **Source:** `packages/effect/src/unstable/cli/Prompt.ts:177`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The label used if the prompt is not confirmed (defaults to `"no"`).
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/cli/Prompt.ConfirmOptions.label.deny` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/Prompt.ConfirmOptions.placeholder`

- **Source:** `packages/effect/src/unstable/cli/Prompt.ts:182`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The placeholder to display when a user is responding to the prompt.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/cli/Prompt.ConfirmOptions.placeholder` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/Prompt.ConfirmOptions.placeholder.defaultConfirm`

- **Source:** `packages/effect/src/unstable/cli/Prompt.ts:187`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The placeholder to use if the `initial` value of the prompt is `true` (defaults to `"(Y/n)"`).
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/cli/Prompt.ConfirmOptions.placeholder.defaultConfirm` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/Prompt.ConfirmOptions.placeholder.defaultDeny`

- **Source:** `packages/effect/src/unstable/cli/Prompt.ts:192`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The placeholder to use if the `initial` value of the prompt is `false` (defaults to `"(y/N)"`).
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/cli/Prompt.ConfirmOptions.placeholder.defaultDeny` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/Prompt.DateOptions.message`

- **Source:** `packages/effect/src/unstable/cli/Prompt.ts:207`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The message to display in the prompt.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/cli/Prompt.DateOptions.message` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/Prompt.DateOptions.initial`

- **Source:** `packages/effect/src/unstable/cli/Prompt.ts:212`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The initial date value to display in the prompt (defaults to the current date).
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/cli/Prompt.DateOptions.initial` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/Prompt.DateOptions.dateMask`

- **Source:** `packages/effect/src/unstable/cli/Prompt.ts:216`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The format mask of the date (defaults to `YYYY-MM-DD HH:mm:ss`).
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/cli/Prompt.DateOptions.dateMask` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/Prompt.DateOptions.validate`

- **Source:** `packages/effect/src/unstable/cli/Prompt.ts:221`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** An effectful function that can be used to validate the value entered into the prompt before final submission.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/cli/Prompt.DateOptions.validate` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/Prompt.DateOptions.locales`

- **Source:** `packages/effect/src/unstable/cli/Prompt.ts:225`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Custom locales that can be used in place of the defaults.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/cli/Prompt.DateOptions.locales` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/Prompt.DateOptions.locales.months`

- **Source:** `packages/effect/src/unstable/cli/Prompt.ts:229`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The full names of each month of the year.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/cli/Prompt.DateOptions.locales.months` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/Prompt.DateOptions.locales.monthsShort`

- **Source:** `packages/effect/src/unstable/cli/Prompt.ts:246`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The short names of each month of the year.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/cli/Prompt.DateOptions.locales.monthsShort` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/Prompt.DateOptions.locales.weekdays`

- **Source:** `packages/effect/src/unstable/cli/Prompt.ts:263`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The full names of each day of the week.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/cli/Prompt.DateOptions.locales.weekdays` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/Prompt.DateOptions.locales.weekdaysShort`

- **Source:** `packages/effect/src/unstable/cli/Prompt.ts:267`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The short names of each day of the week.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/cli/Prompt.DateOptions.locales.weekdaysShort` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/Prompt.IntegerOptions.message`

- **Source:** `packages/effect/src/unstable/cli/Prompt.ts:282`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The message to display in the prompt.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/cli/Prompt.IntegerOptions.message` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/Prompt.IntegerOptions.default`

- **Source:** `packages/effect/src/unstable/cli/Prompt.ts:286`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The default value of the integer prompt.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/cli/Prompt.IntegerOptions.default` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/Prompt.IntegerOptions.min`

- **Source:** `packages/effect/src/unstable/cli/Prompt.ts:290`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The minimum value that can be entered by the user (defaults to `-Infinity`).
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/cli/Prompt.IntegerOptions.min` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/Prompt.IntegerOptions.max`

- **Source:** `packages/effect/src/unstable/cli/Prompt.ts:294`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The maximum value that can be entered by the user (defaults to `Infinity`).
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/cli/Prompt.IntegerOptions.max` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/Prompt.IntegerOptions.incrementBy`

- **Source:** `packages/effect/src/unstable/cli/Prompt.ts:299`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The value that will be used to increment the prompt value when using the up arrow key (defaults to `1`).
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/cli/Prompt.IntegerOptions.incrementBy` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/Prompt.IntegerOptions.decrementBy`

- **Source:** `packages/effect/src/unstable/cli/Prompt.ts:304`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The value that will be used to decrement the prompt value when using the down arrow key (defaults to `1`).
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/cli/Prompt.IntegerOptions.decrementBy` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/Prompt.IntegerOptions.validate`

- **Source:** `packages/effect/src/unstable/cli/Prompt.ts:309`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** An effectful function that can be used to validate the value entered into the prompt before final submission.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/cli/Prompt.IntegerOptions.validate` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/Prompt.FloatOptions.precision`

- **Source:** `packages/effect/src/unstable/cli/Prompt.ts:327`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The precision to use for the floating point value (defaults to `2`).
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/cli/Prompt.FloatOptions.precision` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/Prompt.ListOptions.delimiter`

- **Source:** `packages/effect/src/unstable/cli/Prompt.ts:341`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The delimiter that separates list entries.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/cli/Prompt.ListOptions.delimiter` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/Prompt.FileOptions.type`

- **Source:** `packages/effect/src/unstable/cli/Prompt.ts:359`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The path type that will be selected, defaulting to `"file"`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/cli/Prompt.FileOptions.type` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/Prompt.FileOptions.message`

- **Source:** `packages/effect/src/unstable/cli/Prompt.ts:363`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The message to display in the prompt, defaulting to `"Choose a file"`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/cli/Prompt.FileOptions.message` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/Prompt.FileOptions.startingPath`

- **Source:** `packages/effect/src/unstable/cli/Prompt.ts:368`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Where the user will initially be prompted to select files from, defaulting to the current working directory.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/cli/Prompt.FileOptions.startingPath` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/Prompt.FileOptions.default`

- **Source:** `packages/effect/src/unstable/cli/Prompt.ts:372`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The default path to select when the prompt is first displayed.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/cli/Prompt.FileOptions.default` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/Prompt.FileOptions.maxPerPage`

- **Source:** `packages/effect/src/unstable/cli/Prompt.ts:376`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The number of choices to display at one time, defaulting to `10`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/cli/Prompt.FileOptions.maxPerPage` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/Prompt.FileOptions.filter`

- **Source:** `packages/effect/src/unstable/cli/Prompt.ts:381`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** A predicate or effect that keeps a file in the prompt when it returns `true`, defaulting to returning all files.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/cli/Prompt.FileOptions.filter` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/Prompt.SelectOptions.message`

- **Source:** `packages/effect/src/unstable/cli/Prompt.ts:395`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The message to display in the prompt.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/cli/Prompt.SelectOptions.message` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/Prompt.SelectOptions.choices`

- **Source:** `packages/effect/src/unstable/cli/Prompt.ts:399`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The choices to display to the user.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/cli/Prompt.SelectOptions.choices` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/Prompt.SelectOptions.maxPerPage`

- **Source:** `packages/effect/src/unstable/cli/Prompt.ts:403`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The number of choices to display at one time (defaults to `10`).
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/cli/Prompt.SelectOptions.maxPerPage` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/Prompt.AutoCompleteOptions.filterLabel`

- **Source:** `packages/effect/src/unstable/cli/Prompt.ts:417`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The label used for the filter display (defaults to "filter").
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/cli/Prompt.AutoCompleteOptions.filterLabel` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/Prompt.AutoCompleteOptions.filterPlaceholder`

- **Source:** `packages/effect/src/unstable/cli/Prompt.ts:421`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The placeholder shown when the filter is empty (defaults to "type to filter").
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/cli/Prompt.AutoCompleteOptions.filterPlaceholder` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/Prompt.AutoCompleteOptions.emptyMessage`

- **Source:** `packages/effect/src/unstable/cli/Prompt.ts:425`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The message displayed when no choices match (defaults to "No matches").
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/cli/Prompt.AutoCompleteOptions.emptyMessage` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Optional contrast:** Include the absent or empty input only when it teaches a distinct return value.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/Prompt.MultiSelectOptions.selectAll`

- **Source:** `packages/effect/src/unstable/cli/Prompt.ts:439`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Text for the "Select All" option (defaults to "Select All").
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/cli/Prompt.MultiSelectOptions.selectAll` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/Prompt.MultiSelectOptions.selectNone`

- **Source:** `packages/effect/src/unstable/cli/Prompt.ts:443`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Text for the "Select None" option (defaults to "Select None").
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/cli/Prompt.MultiSelectOptions.selectNone` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/Prompt.MultiSelectOptions.inverseSelection`

- **Source:** `packages/effect/src/unstable/cli/Prompt.ts:447`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Text for the "Inverse Selection" option (defaults to "Inverse Selection").
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/cli/Prompt.MultiSelectOptions.inverseSelection` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/Prompt.MultiSelectOptions.min`

- **Source:** `packages/effect/src/unstable/cli/Prompt.ts:451`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The minimum number of choices that must be selected.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/cli/Prompt.MultiSelectOptions.min` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/Prompt.MultiSelectOptions.max`

- **Source:** `packages/effect/src/unstable/cli/Prompt.ts:455`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The maximum number of choices that can be selected.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/cli/Prompt.MultiSelectOptions.max` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/Prompt.SelectChoice`

- **Source:** `packages/effect/src/unstable/cli/Prompt.ts:465`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Represents one choice displayed by select, autocomplete, and multi-select prompts.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/cli/Prompt.SelectChoice`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/Prompt.SelectChoice.title`

- **Source:** `packages/effect/src/unstable/cli/Prompt.ts:469`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The name of the select option that is displayed to the user.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/cli/Prompt.SelectChoice.title` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/Prompt.SelectChoice.value`

- **Source:** `packages/effect/src/unstable/cli/Prompt.ts:473`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The underlying value of the select option.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/cli/Prompt.SelectChoice.value` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/Prompt.SelectChoice.description`

- **Source:** `packages/effect/src/unstable/cli/Prompt.ts:478`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** An optional description for the select option which will be displayed to the user.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/cli/Prompt.SelectChoice.description` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/Prompt.SelectChoice.disabled`

- **Source:** `packages/effect/src/unstable/cli/Prompt.ts:482`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Whether or not this select option is disabled.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/cli/Prompt.SelectChoice.disabled` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/Prompt.SelectChoice.selected`

- **Source:** `packages/effect/src/unstable/cli/Prompt.ts:486`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Whether this option should be selected by default (only used by MultiSelect).
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/cli/Prompt.SelectChoice.selected` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/Prompt.TextOptions.message`

- **Source:** `packages/effect/src/unstable/cli/Prompt.ts:500`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The message to display in the prompt.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/cli/Prompt.TextOptions.message` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/Prompt.TextOptions.default`

- **Source:** `packages/effect/src/unstable/cli/Prompt.ts:504`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The default value of the text option.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/cli/Prompt.TextOptions.default` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/Prompt.TextOptions.validate`

- **Source:** `packages/effect/src/unstable/cli/Prompt.ts:509`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** An effectful function that can be used to validate the value entered into the prompt before final submission.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/cli/Prompt.TextOptions.validate` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/Prompt.ToggleOptions.message`

- **Source:** `packages/effect/src/unstable/cli/Prompt.ts:523`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The message to display in the prompt.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/cli/Prompt.ToggleOptions.message` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/Prompt.ToggleOptions.initial`

- **Source:** `packages/effect/src/unstable/cli/Prompt.ts:527`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The intitial value of the toggle prompt (defaults to `false`).
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/cli/Prompt.ToggleOptions.initial` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/Prompt.ToggleOptions.active`

- **Source:** `packages/effect/src/unstable/cli/Prompt.ts:532`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The text to display when the toggle is in the active state (defaults to `on`).
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/cli/Prompt.ToggleOptions.active` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/Prompt.ToggleOptions.inactive`

- **Source:** `packages/effect/src/unstable/cli/Prompt.ts:537`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** The text to display when the toggle is in the inactive state (defaults to `off`).
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/cli/Prompt.ToggleOptions.inactive` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/Prompt.Any`

- **Source:** `packages/effect/src/unstable/cli/Prompt.ts:586`
- **Kind / category:** `root-declaration` / `utility types`
- **Priority:** **optional**
- **Current description:** Type alias for any `Prompt`, regardless of its output type.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/cli/Prompt.Any`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/Prompt.All`

- **Source:** `packages/effect/src/unstable/cli/Prompt.ts:593`
- **Kind / category:** `namespace` / `none`
- **Priority:** **optional**
- **Current description:** Namespace containing return-type helpers for `Prompt.all`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/cli/Prompt.All`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/Prompt.All.ReturnIterable`

- **Source:** `packages/effect/src/unstable/cli/Prompt.ts:604`
- **Kind / category:** `namespace-declaration` / `utility types`
- **Priority:** **optional**
- **Current description:** Computes the prompt returned by `Prompt.all` for an iterable of prompts.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/cli/Prompt.All.ReturnIterable`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/Prompt.All.ReturnTuple`

- **Source:** `packages/effect/src/unstable/cli/Prompt.ts:614`
- **Kind / category:** `namespace-declaration` / `utility types`
- **Priority:** **optional**
- **Current description:** Computes the prompt returned by `Prompt.all` for a readonly tuple or array of prompts, preserving tuple positions in the output type.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/cli/Prompt.All.ReturnTuple`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/Prompt.All.ReturnObject`

- **Source:** `packages/effect/src/unstable/cli/Prompt.ts:626`
- **Kind / category:** `namespace-declaration` / `utility types`
- **Priority:** **optional**
- **Current description:** Computes the prompt returned by `Prompt.all` for a record of prompts, preserving the record keys and replacing each prompt with its output type.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/cli/Prompt.All.ReturnObject`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/Prompt.All.Return`

- **Source:** `packages/effect/src/unstable/cli/Prompt.ts:640`
- **Kind / category:** `namespace-declaration` / `constructors`
- **Priority:** **optional**
- **Current description:** Computes the return prompt type for `Prompt.all` based on the input structure.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/cli/Prompt.All.Return`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.
