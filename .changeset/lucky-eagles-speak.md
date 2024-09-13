---
"effect": minor
---

add Effect.makeLatch, for creating a simple async latch

```ts
import { Effect } from "effect"

Effect.gen(function* () {
  // Create a latch, starting in the closed state
  const latch = yield* Effect.makeLatch(false)

  // Fork a fiber that logs "open sesame" when the latch is opened
  const fiber = yield* Effect.log("open sesame").pipe(
    latch.whenOpen,
    Effect.fork
  )

  // Open the latch
  yield* latch.open
  yield* fiber.await
})
```
