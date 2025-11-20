---
"@effect/opentelemetry": patch
"effect": patch
---

Add logs to first propagated span, in the following case before this fix the log would not be added to the `p` span because `Effect.fn` adds a fake span for the purpose of adding a stack frame.

```ts
import { Effect } from "effect"

const f = Effect.fn(function* () {
  yield* Effect.logWarning("FooBar")
  return yield* Effect.fail("Oops")
})

const p = f().pipe(Effect.withSpan("p"))
```
