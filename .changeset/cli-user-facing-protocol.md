---
"effect": patch
---

Add a UserFacing protocol so Command.run can render tagged handler errors

`CliError.UserError` implements the protocol, so its `userMessage` now defaults to `""` and is always present in encoded output.
