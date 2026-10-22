---
"effect": patch
"@effect/platform-node-shared": patch
"@effect/platform-deno": patch
"@effect/docgen": patch
---

Add `CommandLine` to `effect/process` for quoting, joining, splitting and displaying command lines for POSIX shells, PowerShell and Windows programs. `ChildProcess` arguments and `env` values can be `Redacted`, and spawn errors show the command quoted with `Redacted` values masked.

Fix `ChildProcess.make` templates splitting quoted words and passing shell syntax to the program as literal arguments. Quoted words now stay together, and shell syntax such as `|`, `$HOME`, `*` or `~` throws a `CommandLineError`; quote such characters or pass values with `${}`. With the `shell` option, the template is the script as written and cannot contain `${}` values, which were previously inserted unquoted.

Fix commands with both `shell` and arguments passing the arguments to the shell unquoted. They now fail with a `BadArgument` error; pass the whole script as the command, built with `CommandLine.join` or `CommandLine.quote`.

With `extendEnv: true`, an `env` value of `undefined` now removes the inherited variable. The Node and Bun spawners fail with `BadArgument`, instead of a defect, when the command, an argument or an `env` value contains a NUL character.

### Breaking changes

- `StandardCommand.args` and `env` values can be `Redacted` strings. Code that reads them as `string` must handle `Redacted`.
- `ChildProcess.TemplateExpression` and `ChildProcess.TemplateExpressionItem` are removed. Use `CommandLine.TemplateExpression` and `CommandLine.TemplateExpressionItem`.
