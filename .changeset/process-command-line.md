---
"effect": minor
"@effect/platform-node-shared": minor
"@effect/platform-deno": minor
"@effect/docgen": patch
---

Add `CommandLine` to `effect/process` for quoting, joining, splitting and safely displaying command lines for POSIX shells, PowerShell and Windows programs; `ChildProcess` accepts `Redacted` arguments and environment values, and child process errors show quoted commands.

### Breaking changes

- `ChildProcess.make` templates now group quoted words and throw a `CommandLineError` for shell syntax such as `|`, `$HOME`, `*` or `~`. Quote such characters or pass values with `${}`. With the `shell` option, the template is the script and cannot contain `${}` values.
- Running a command with both `shell` and arguments fails with a `BadArgument` error. Pass the whole script as the command, building it with `CommandLine.join` or `CommandLine.quote`.
- `StandardCommand.args` and `env` values can be `Redacted` strings.
- `ChildProcess.TemplateExpression` and `ChildProcess.TemplateExpressionItem` are removed. Use `CommandLine.TemplateExpression` and `CommandLine.TemplateExpressionItem`.
