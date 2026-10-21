---
"effect": patch
---

Add `Command.validate` and `CliError.ValidationError` to the unstable CLI. `validate` checks the parsed input before the handler runs, for rules such as mutually exclusive flags. A failure is shown with the command help, like any parse error.
