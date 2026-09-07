# CLI constructor naming contract

This is the tests-first contract for the expanded CLI naming refactor. The corresponding implementation is pending. Public constructor exports use PascalCase, including CLI-specific constructors and the factories documented in the constructors category. Combinators, runners, getters, guards, layers, and configuration values keep their existing names.

## Value constructors

Apply each row wherever the current constructor exists. Preserve signatures, singleton versus function shapes, parsing behavior, tags, help labels, and completion output.

| Previous name     | Intended name     | Modules                                                |
| ----------------- | ----------------- | ------------------------------------------------------ |
| `string`          | `String`          | Primitive, Param, Flag, Argument (already implemented) |
| `boolean`         | `Boolean`         | Primitive, Param, Flag (already implemented)           |
| `float`           | `Finite`          | Primitive, Param, Flag, Argument (already implemented) |
| `integer`         | `Int`             | Primitive, Param, Flag, Argument (already implemented) |
| `date`            | `Date`            | Primitive, Param, Flag, Argument (already implemented) |
| `redacted`        | `Redacted`        | Primitive, Param, Flag, Argument (already implemented) |
| `choice`          | `Choice`          | Primitive, Param, Flag, Argument                       |
| `choiceWithValue` | `ChoiceWithValue` | Param, Flag, Argument                                  |
| `path`            | `Path`            | Primitive, Param, Flag, Argument                       |
| `file`            | `File`            | Param, Flag, Argument                                  |
| `directory`       | `Directory`       | Param, Flag, Argument                                  |
| `fileText`        | `FileText`        | Primitive, Param, Flag, Argument                       |
| `fileParse`       | `FileParse`       | Primitive, Param, Flag, Argument                       |
| `fileSchema`      | `FileSchema`      | Primitive, Param, Flag, Argument                       |
| `keyValuePair`    | `KeyValuePair`    | Primitive, Param, Flag                                 |
| `none`            | `None`            | Primitive, Param, Flag, Argument                       |
| `makeSingle`      | `MakeSingle`      | Param                                                  |

`Primitive.Choice` still accepts key/value pairs. `Flag.Choice`, `Argument.Choice`, and `Param.Choice` still infer a literal union from string choices. `Primitive.None`, `Flag.None`, and `Argument.None` remain singleton values; `Param.None` remains a function taking a kind. There is no new `Argument.Boolean` or `Argument.KeyValuePair`.

## Prompt constructors

Prompt names identify interactive controls. Preserve the existing control names and their option interfaces; capitalization does not add Schema validation. In particular, `Prompt.float` uses its own numeric processor and does not enforce `Schema.Finite`, so its new name is `Float`, not `Finite`.

| Previous name  | Intended name  |
| -------------- | -------------- |
| `makeTheme`    | `MakeTheme`    |
| `confirm`      | `Confirm`      |
| `custom`       | `Custom`       |
| `date`         | `Date`         |
| `file`         | `File`         |
| `float`        | `Float`        |
| `hidden`       | `Hidden`       |
| `integer`      | `Integer`      |
| `list`         | `List`         |
| `password`     | `Password`     |
| `select`       | `Select`       |
| `autoComplete` | `AutoComplete` |
| `multiSelect`  | `MultiSelect`  |
| `succeed`      | `Succeed`      |
| `text`         | `Text`         |
| `toggle`       | `Toggle`       |

Both overloads of `Custom`, including the external-event overload, are preserved. `Prompt.all` is a combining operation; `map`, `flatMap`, and `run` also keep their names. `Theme` remains the existing context reference; `MakeTheme` is the factory.

## Other public constructors

| Previous API                 | Intended API                 |
| ---------------------------- | ---------------------------- |
| `Command.make`               | `Command.Make`               |
| `CliConfig.make`             | `CliConfig.Make`             |
| `CliOutput.defaultFormatter` | `CliOutput.DefaultFormatter` |
| `Completions.generate`       | `Completions.Generate`       |
| `GlobalFlag.action`          | `GlobalFlag.Action`          |
| `GlobalFlag.setting`         | `GlobalFlag.Setting`         |

The capitalized `GlobalFlag.Action` and `GlobalFlag.Setting` values must coexist with the existing types of those names. Built-in global flags (`Help`, `Version`, `Wizard`, `Completions`, `LogLevel`, `BuiltIns`), CLI error classes, `CliConfig.CliConfig`, and `CliOutput.Formatter` already use PascalCase. `HelpDoc` defines data shapes and has no runtime constructors. Internal modules are implementation details, not additional public rename targets.

## Implementation handoff

Implement the map above and update source consumers, JSDoc examples, AI documentation, and migration annotations. Account for namespace and global collisions, especially `Primitive.Path` with the imported Path module, `Prompt.Date` with JavaScript Date, and the GlobalFlag type/value names. Preserve primitive tags (`Float`, `Integer`, `Choice`, `Path`, and the others); this is an export naming change.

The runtime and type tests encode the new API and intentionally fail until implementation lands. Existing behavior assertions and snapshots are retained. Additional tests cover file text/parse/schema behavior, the `None` sentinel, constructor output types, and literal inference.

Run the CLI runtime suite, all CLI type tests, repository type checking and lint, and affected documentation examples after implementation. The prior review also requested restoring the two edited archived `.changeset/pre/` files, explicitly labeling the changeset as a breaking RC naming change, and alphabetizing the Args migration annotations. Those production-documentation changes belong to the implementation run.
