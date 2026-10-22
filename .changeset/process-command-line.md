---
"effect": patch
"@effect/platform-node-shared": patch
"@effect/platform-deno": patch
"@effect/docgen": patch
---

Add `CommandLine` to `effect/process` for quoting, joining, splitting and safely displaying command lines for POSIX shells, PowerShell and Windows programs; `ChildProcess` accepts `Redacted` arguments and environment values, and child process errors show quoted commands.

Fix `ChildProcess.make` templates splitting quoted words and passing shell syntax to the program as literal arguments. Templates now group quoted words and throw a `CommandLineError` for shell syntax such as `|`, `$HOME`, `*` or `~`; quote such characters or pass values with `${}`. With the `shell` option, the template is the script and cannot contain `${}` values, which were previously inserted unquoted.

Fix commands with both `shell` and arguments passing the arguments to the shell unquoted. They now fail with a `BadArgument` error; pass the whole script as the command, building it with `CommandLine.join` or `CommandLine.quote`.

### Breaking changes

- `StandardCommand.args` and `env` values can be `Redacted` strings.
- `ChildProcess.TemplateExpression` and `ChildProcess.TemplateExpressionItem` are removed. Use `CommandLine.TemplateExpression` and `CommandLine.TemplateExpressionItem`.
