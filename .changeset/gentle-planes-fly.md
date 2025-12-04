---
"effect": minor
---

Add `Effect.fromOption` and `Effect.fromOptionOrElse` to convert Option values into Effect values that fail

- `Effect.fromOption` - Converts an Option into an Effect, failing with `NoSuchElementException` if the Option is `None`
- `Effect.fromOptionOrElse` - Converts an Option into an Effect, failing with a custom error if the Option is `None` (supports data-last usage)
