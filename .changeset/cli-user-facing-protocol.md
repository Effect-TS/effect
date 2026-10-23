---
"effect": patch
---

Add the `CliError.userMessage` annotation so `Command.run` renders tagged handler errors without wrapping them in `CliError.UserError`.
