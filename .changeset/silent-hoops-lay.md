---
"effect": patch
---

Avoid losing the type when using hasProperty, enables:

```ts
import { Effect, Schema as S } from "effect"
import { hasProperty } from "effect/Predicate"

class FooError extends S.TaggedError<FooError>()("FooError", {}) {
  readonly _a = true
}

class BarError extends S.TaggedError<BarError>()("BarError", {}) {
  readonly _a = true
  readonly _b = true
}

class BazError extends S.TaggedError<BazError>()("BazError", {}) {
  readonly _b = true
}

const baz = (x: number) =>
  Effect.gen(function* () {
    if (x > 2) {
      return yield* new FooError()
    } else if (x > 1) {
      return yield* new BarError()
    } else {
      return yield* new BazError()
    }
  })

// Effect.Effect<void, FooError, never>
export const result = baz(1).pipe(
  Effect.catchIf(hasProperty("_b"), (e) => Effect.log(`${e._tag}`))
)
```
