---
"effect": patch
---

Allow `Command.validate` to fail with your own errors, which `Command.run` reports like handler failures instead of showing help.

`Command.withHandler` now keeps the command's existing error type, so errors from earlier validations are not lost. When it replaces a handler, the old handler's errors also stay in the type. Code that annotates such a command with a narrower error type must widen the annotation, or pass the final handler to `Command.make` instead.
