---
"effect": patch
---

Rename the constructors in `effect/unstable/cli` to PascalCase, matching `Schema` and `Config`. Combinators, guards, runners, layers, and factories such as `Command.make`, `CliConfig.make`, `Param.makeSingle`, `Prompt.makeTheme`, `Prompt.succeed`, `Completions.generate`, and `CliOutput.defaultFormatter` keep their names.

This is a breaking naming cleanup for the Effect 4 release candidate.

In `Primitive`, `Param`, `Flag`, and `Argument`:

- `string` -> `String`
- `boolean` -> `Boolean`
- `integer` -> `Int`
- `float` -> `Finite`
- `date` -> `Date`
- `redacted` -> `Redacted`
- `choice` -> `Choice`
- `choiceWithValue` -> `ChoiceWithValue`
- `path` -> `Path`
- `file` -> `File`
- `directory` -> `Directory`
- `fileText` -> `FileText`
- `fileParse` -> `FileParse`
- `fileSchema` -> `FileSchema`
- `keyValuePair` -> `KeyValuePair`
- `none` -> `None`

There is no `Argument.Boolean`, since positional booleans are not supported.

In `Prompt`: `text` -> `Text`, `integer` -> `Integer`, `float` -> `Float`, `date` -> `Date`, `file` -> `File`, `confirm` -> `Confirm`, `toggle` -> `Toggle`, `select` -> `Select`, `multiSelect` -> `MultiSelect`, `autoComplete` -> `AutoComplete`, `list` -> `List`, `password` -> `Password`, `hidden` -> `Hidden`, and `custom` -> `Custom`. `Prompt.Float` keeps its own numeric parser and does not enforce `Schema.Finite`.

In `GlobalFlag`: `action` -> `Action` and `setting` -> `Setting`, alongside the existing types of the same name.

The `Primitive` tags follow the new names: `Primitive.Int._tag` is `"Int"` and `Primitive.Finite._tag` is `"Finite"`. The `Completions.CompletionType` union uses the same tags. Parsing behavior, help labels, and completion output are unchanged.
