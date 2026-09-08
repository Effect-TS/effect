---
"effect": patch
---

Rename CLI value and control constructors to PascalCase. Scalar value constructor names align with `Schema` and `Config`. Combinators, guards, runners, layers, and factories such as `Command.make`, `CliConfig.make`, `Param.makeSingle`, `Prompt.makeTheme`, `Prompt.succeed`, `Completions.generate`, and `CliOutput.defaultFormatter` keep their lowercase names.

This is a breaking API cleanup for the Effect 4 release candidate, covering constructor names and public completion descriptor tags.

The value constructor renames apply to these modules:

| Previous name     | New name          | Modules                          |
| ----------------- | ----------------- | -------------------------------- |
| `string`          | `String`          | Primitive, Param, Flag, Argument |
| `boolean`         | `Boolean`         | Primitive, Param, Flag           |
| `integer`         | `Int`             | Primitive, Param, Flag, Argument |
| `float`           | `Finite`          | Primitive, Param, Flag, Argument |
| `date`            | `Date`            | Primitive, Param, Flag, Argument |
| `redacted`        | `Redacted`        | Primitive, Param, Flag, Argument |
| `choice`          | `Choice`          | Primitive                        |
| `choice`          | `Literals`        | Param, Flag, Argument            |
| `choiceWithValue` | `ChoiceWithValue` | Param, Flag, Argument            |
| `path`            | `Path`            | Primitive, Param, Flag, Argument |
| `file`            | `File`            | Param, Flag, Argument            |
| `directory`       | `Directory`       | Param, Flag, Argument            |
| `fileText`        | `FileText`        | Primitive, Param, Flag, Argument |
| `fileParse`       | `FileParse`       | Primitive, Param, Flag, Argument |
| `fileSchema`      | `FileSchema`      | Primitive, Param, Flag, Argument |
| `keyValuePair`    | `KeyValuePair`    | Primitive, Param, Flag           |
| `none`            | `None`            | Primitive, Param, Argument       |
| `none`            | `Never`           | Flag                             |

`Argument` has no `Boolean` or `KeyValuePair` constructor. `Primitive` has no `File`, `Directory`, or `ChoiceWithValue` constructor; use `Primitive.Path` with a path type, or `Primitive.Choice` with key/value pairs.

In `Prompt`: `text` -> `String`, `integer` -> `Int`, `float` -> `Number`, `date` -> `Date`, `file` -> `File`, `confirm` -> `Confirm`, `toggle` -> `Toggle`, `select` -> `Select`, `multiSelect` -> `MultiSelect`, `autoComplete` -> `AutoComplete`, `list` -> `List`, `password` -> `Password`, `hidden` -> `Hidden`, and `custom` -> `Custom`. `Prompt.Int` matches the integer constructor name in the value-parser modules. `Prompt.Number` keeps its own numeric parser and does not enforce `Schema.Finite`. `Prompt.succeed` remains lowercase, following `Effect.succeed`.

In `GlobalFlag`: `action` -> `Action` and `setting` -> `Setting`, alongside the existing types of the same name.

The public `_tag` values also change: `Primitive.Int._tag` changes from `"Integer"` to `"Int"`, and `Primitive.Finite._tag` changes from `"Float"` to `"Finite"`. Both `Completions.FlagType` and `Completions.ArgumentType` make the same breaking changes from `"Integer"`/`"Float"` to `"Int"`/`"Finite"`. Update custom completion descriptors and any switches or pattern matches on those tags. Parsing behavior, help labels, and generated completion scripts are unchanged.
