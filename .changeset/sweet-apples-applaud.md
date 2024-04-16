---
"effect": patch
---

add FiberHandle module, for holding a reference to a running fiber

```ts
import { Effect, FiberHandle } from "effect"

Effect.gen(function* (_) {
  const handle = yield* _(FiberHandle.make())

  // run some effects
  yield* _(FiberHandle.run(handle, Effect.never))
  // this will interrupt the previous fiber
  yield* _(FiberHandle.run(handle, Effect.never))
  // this will not run, as a fiber is already running
  yield* _(FiberHandle.run(handle, Effect.never, { onlyIfMissing: true }))

  yield* _(Effect.sleep(1000))
}).pipe(
  Effect.scoped // The fiber will be interrupted when the scope is closed
)
```
