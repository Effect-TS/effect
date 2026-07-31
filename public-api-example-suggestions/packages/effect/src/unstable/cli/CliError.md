# Example Suggestions: `effect/unstable/cli/CliError`

- **Package:** `effect`
- **Source:** `packages/effect/src/unstable/cli/CliError.ts`
- **Uncovered API records:** 18
- **Priorities:** 0 required, 0 recommended, 10 optional, 8 discouraged

## Instructions

Treat each entry as a research prompt, not a requirement to maximize example count. Before editing, inspect the declaration, implementation, targeted tests, production call sites, sibling documentation, and existing module examples. Keep only scenarios supported by repository evidence, downgrade weak suggestions, and prefer one family-level example over repetitive snippets.

Use public imports, `ts import.meta.vitest`, semantic trailing `// =>` assertions, deterministic bounded inputs, explicit Effect execution, and package-local docgen plus targeted doctest validation. Preserve type-only examples without artificial runtime assertions.

## API Index

| API                                                            | Line | Kind               | Priority        |
| -------------------------------------------------------------- | ---: | ------------------ | --------------- |
| `effect/unstable/cli/CliError.UnrecognizedOption.message`      |  137 | `member`           | **optional**    |
| `effect/unstable/cli/CliError.DuplicateOption.message`         |  190 | `member`           | **optional**    |
| `effect/unstable/cli/CliError.MissingOption.message`           |  245 | `member`           | **optional**    |
| `effect/unstable/cli/CliError.MissingArgument.message`         |  298 | `member`           | **optional**    |
| `effect/unstable/cli/CliError.UnexpectedArgument.message`      |  339 | `member`           | **optional**    |
| `effect/unstable/cli/CliError.InvalidValue.message`            |  399 | `member`           | **optional**    |
| `effect/unstable/cli/CliError.UnknownSubcommand.message`       |  468 | `member`           | **optional**    |
| `effect/unstable/cli/CliError.NonShowHelpErrors (type) (type)` |  540 | `root-declaration` | **optional**    |
| `effect/unstable/cli/CliError.NonShowHelpErrors (type) (type)` |  574 | `root-declaration` | **optional**    |
| `effect/unstable/cli/CliError.ShowHelp`                        |  588 | `root-declaration` | **optional**    |
| `effect/unstable/cli/CliError.UnrecognizedOption.TypeId`       |  130 | `member`           | **discouraged** |
| `effect/unstable/cli/CliError.DuplicateOption.TypeId`          |  183 | `member`           | **discouraged** |
| `effect/unstable/cli/CliError.MissingOption.TypeId`            |  238 | `member`           | **discouraged** |
| `effect/unstable/cli/CliError.MissingArgument.TypeId`          |  291 | `member`           | **discouraged** |
| `effect/unstable/cli/CliError.UnexpectedArgument.TypeId`       |  332 | `member`           | **discouraged** |
| `effect/unstable/cli/CliError.InvalidValue.TypeId`             |  392 | `member`           | **discouraged** |
| `effect/unstable/cli/CliError.UnknownSubcommand.TypeId`        |  461 | `member`           | **discouraged** |
| `effect/unstable/cli/CliError.UserError.TypeId`                |  526 | `member`           | **discouraged** |

## Optional

### `effect/unstable/cli/CliError.UnrecognizedOption.message`

- **Source:** `packages/effect/src/unstable/cli/CliError.ts:137`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Formats the unrecognized option with command context and suggestions.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/cli/CliError.UnrecognizedOption.message` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/CliError.DuplicateOption.message`

- **Source:** `packages/effect/src/unstable/cli/CliError.ts:190`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Explains which parent and child commands define the duplicate option.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/cli/CliError.DuplicateOption.message` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/CliError.MissingOption.message`

- **Source:** `packages/effect/src/unstable/cli/CliError.ts:245`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Formats the missing required flag for display.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/cli/CliError.MissingOption.message` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/CliError.MissingArgument.message`

- **Source:** `packages/effect/src/unstable/cli/CliError.ts:298`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Formats the missing required positional argument for display.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/cli/CliError.MissingArgument.message` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/CliError.UnexpectedArgument.message`

- **Source:** `packages/effect/src/unstable/cli/CliError.ts:339`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Formats the unexpected positional arguments for display.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/cli/CliError.UnexpectedArgument.message` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/CliError.InvalidValue.message`

- **Source:** `packages/effect/src/unstable/cli/CliError.ts:399`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Formats the invalid flag or argument value with the expected input.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/cli/CliError.InvalidValue.message` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/CliError.UnknownSubcommand.message`

- **Source:** `packages/effect/src/unstable/cli/CliError.ts:468`
- **Kind / category:** `member` / `none`
- **Priority:** **optional**
- **Current description:** Formats the unknown subcommand with parent command context and suggestions.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Construct the owning value through a public constructor, exercise the operation in which `effect/unstable/cli/CliError.UnknownSubcommand.message` changes behavior, and assert the enclosing operation's result. Do not use a property assignment that merely repeats the field type.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/CliError.NonShowHelpErrors (type) (type)`

- **Source:** `packages/effect/src/unstable/cli/CliError.ts:540`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Schema for concrete CLI errors that can be reported together with help output.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { CliError } from "effect/unstable/cli"` and use `CliError.NonShowHelpErrors`.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `CliError.NonShowHelpErrors`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/CliError.NonShowHelpErrors (type) (type)`

- **Source:** `packages/effect/src/unstable/cli/CliError.ts:574`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Type of CLI errors that are not `ShowHelp`.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `effect/unstable/cli/CliError.NonShowHelpErrors (type)`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

### `effect/unstable/cli/CliError.ShowHelp`

- **Source:** `packages/effect/src/unstable/cli/CliError.ts:588`
- **Kind / category:** `root-declaration` / `models`
- **Priority:** **optional**
- **Current description:** Error data requesting CLI help rendering for a command path.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Start from `import { CliError } from "effect/unstable/cli"` and use `CliError.ShowHelp`.
- **Suggested snippet:** Use a type-level snippet that obtains a representative value through public APIs and demonstrates one useful inference, narrowing, or extracted type involving `CliError.ShowHelp`. Keep `import.meta.vitest`, but do not add a tautological runtime assertion.
- **Optional contrast:** Contrast success with exactly one relevant failure mode; do not enumerate every variant.
- **Future-agent advice:** Add this only when tests, typetests, or real call sites demonstrate a useful distinction; otherwise leave the API example-free.

## Discouraged

### `effect/unstable/cli/CliError.UnrecognizedOption.TypeId`

- **Source:** `packages/effect/src/unstable/cli/CliError.ts:130`
- **Kind / category:** `member` / `none`
- **Priority:** **discouraged**
- **Current description:** Marks this value as a CLI parsing error for runtime guards.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `effect/unstable/cli/CliError.UnrecognizedOption.TypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/unstable/cli/CliError.DuplicateOption.TypeId`

- **Source:** `packages/effect/src/unstable/cli/CliError.ts:183`
- **Kind / category:** `member` / `none`
- **Priority:** **discouraged**
- **Current description:** Marks this value as a CLI configuration error for runtime guards.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `effect/unstable/cli/CliError.DuplicateOption.TypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/unstable/cli/CliError.MissingOption.TypeId`

- **Source:** `packages/effect/src/unstable/cli/CliError.ts:238`
- **Kind / category:** `member` / `none`
- **Priority:** **discouraged**
- **Current description:** Marks this value as a missing CLI option error for runtime guards.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `effect/unstable/cli/CliError.MissingOption.TypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/unstable/cli/CliError.MissingArgument.TypeId`

- **Source:** `packages/effect/src/unstable/cli/CliError.ts:291`
- **Kind / category:** `member` / `none`
- **Priority:** **discouraged**
- **Current description:** Marks this value as a missing CLI argument error for runtime guards.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `effect/unstable/cli/CliError.MissingArgument.TypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/unstable/cli/CliError.UnexpectedArgument.TypeId`

- **Source:** `packages/effect/src/unstable/cli/CliError.ts:332`
- **Kind / category:** `member` / `none`
- **Priority:** **discouraged**
- **Current description:** Marks this value as an unexpected CLI argument error for runtime guards.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `effect/unstable/cli/CliError.UnexpectedArgument.TypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/unstable/cli/CliError.InvalidValue.TypeId`

- **Source:** `packages/effect/src/unstable/cli/CliError.ts:392`
- **Kind / category:** `member` / `none`
- **Priority:** **discouraged**
- **Current description:** Marks this value as an invalid CLI value error for runtime guards.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `effect/unstable/cli/CliError.InvalidValue.TypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/unstable/cli/CliError.UnknownSubcommand.TypeId`

- **Source:** `packages/effect/src/unstable/cli/CliError.ts:461`
- **Kind / category:** `member` / `none`
- **Priority:** **discouraged**
- **Current description:** Marks this value as an unknown CLI subcommand error for runtime guards.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `effect/unstable/cli/CliError.UnknownSubcommand.TypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.

### `effect/unstable/cli/CliError.UserError.TypeId`

- **Source:** `packages/effect/src/unstable/cli/CliError.ts:526`
- **Kind / category:** `member` / `none`
- **Priority:** **discouraged**
- **Current description:** Marks this value as a user handler error for runtime guards.
- **Signature hint:** Not available from the current model.
- **Import guidance:** Derive the public import from the module barrel or type owner; the model has no direct import guidance.
- **Suggested snippet:** Do not add a standalone snippet by default. If direct public usage of `effect/unstable/cli/CliError.UserError.TypeId` is supported by tests or production call sites, show it only inside the smallest safe integration and assert the integration result rather than the low-level marker itself.
- **Optional contrast:** Prefer concise prose or a useful `@see` link when no supported integration scenario exists.
- **Future-agent advice:** Prefer concise prose and a useful `@see` link. Add a snippet only when direct public use is supported by repository evidence.
