---
"effect": minor
"@effect/platform-node-shared": minor
"@effect/platform-deno": minor
"@effect/docgen": minor
---

Add `CommandLine` to `effect/process` for quoting and joining command lines, and support `Redacted` arguments and `env` values in `ChildProcess`.

Migration:

- `ChildProcess.make` templates keep quoted words together and throw a `CommandLineError` for shell syntax such as `|`, `$HOME` or `*`. Quote such characters or pass them with `${}`.
- With the `shell` option, templates cannot contain `${}` values and extra arguments fail with `BadArgument`. Pass the whole script as the command, built with `CommandLine.join`.
- `StandardCommand.args` and `env` values can be `Redacted` strings.
- `ChildProcess.TemplateExpression` and `ChildProcess.TemplateExpressionItem` are removed. Use the `CommandLine` types of the same name.
