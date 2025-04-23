---
"effect": major
---

Possibility to recover from unhandled errors in `catchTags`.

This addition introduces the possibility to define a function as a second parameter that gets the error type which was unhandled in the map before.

```ts
import { Data, Effect } from "effect"

class A extends Data.TaggedError("A") {}
class B extends Data.TaggedError("B") {}
class C extends Data.TaggedError("C") {}
class D extends Data.TaggedError("D") {}

const program = Effect.gen(function* () {
  const types = [A, B, C, D]
  const Exception = types[Math.floor(Math.random() * types.length)]

  return yield* new Exception()
}).pipe(
  Effect.catchTags(
    {
      A: (a) => Effect.succeed(a._tag),
      B: (b) => Effect.succeed(b._tag)
    },
    (remaining) => Effect.succeed(`remaining: ${remaining._tag}`) // C | D
  )
)
```
