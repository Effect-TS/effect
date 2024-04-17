---
"effect": minor
---

add Effect.timeoutOption

Returns an effect that will return `None` if the effect times out, otherwise it
will return `Some` of the produced value.

```ts
import { Effect } from "effect"

// will return `None` after 500 millis
Effect.succeed("hello").pipe(
  Effect.delay(1000),
  Effect.timeoutOption("500 millis")
)
```
