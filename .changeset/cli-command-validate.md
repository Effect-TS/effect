---
"effect": patch
---

Add `Command.validate` to the unstable CLI for rules that span several flags or arguments, such as mutually exclusive flags, and `CliError.ValidationError` to report them. The validation receives the parsed input before the handler runs; a failure is shown together with the command help, like a parse error.
