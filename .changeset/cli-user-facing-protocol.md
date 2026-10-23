---
"effect": patch
---

Add `CliError.UserFacing` so `Command.run` renders tagged handler errors without wrapping them in `CliError.UserError`.

`CliError.UserError` now implements the protocol, so `userMessage` defaults to `""` and is always included in encoded output.
