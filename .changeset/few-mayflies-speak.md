---
"effect": minor
---

add Semaphore.withPermitsIfAvailable

You can now use `Semaphore.withPermitsIfAvailable` to run an Effect only if the
Semaphore has enough permits available. This is useful when you want to run an
Effect only if you can acquire a permit without blocking.

It will return an `Option.Some` with the result of the Effect if the permits were
available, or `None` if they were not.

```ts
import { Effect } from "effect"

Effect.gen(function* () {
  const semaphore = yield* Effect.makeSemaphore(1)
  semaphore.withPermitsIfAvailable(1)(Effect.void)
})
```
