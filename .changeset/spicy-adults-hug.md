---
"effect": minor
---

Implement Effect.fn to define traced functions.

```ts
import { Effect } from "effect"

const logExample = Effect.fn("example")(function* <N extends number>(n: N) {
  yield* Effect.annotateCurrentSpan("n", n)
  yield* Effect.logInfo(`got: ${n}`)
  yield* Effect.fail(new Error())
}, Effect.delay("1 second"))

Effect.runFork(logExample(100).pipe(Effect.catchAllCause(Effect.logError)))
```
