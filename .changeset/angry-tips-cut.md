---
"effect": patch
---

Added `Effect.ensureError<E>`

This is a no-op type assertion that enforces the error channel of an Effect conforms to
the specified error type `E`.

```ts
import { Effect } from "effect"

// Ensure that all possible errors of the program have been handled exhaustively.
Effect.runPromise(program.pipe(Effect.ensureError<never>()))
```
