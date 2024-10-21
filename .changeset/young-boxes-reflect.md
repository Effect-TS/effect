---
"@effect/vitest": patch
---

Adds property testing to @effect/vitest

```ts
import { Schema } from "effect"
import { it } from "@effect/vitest"

const realNumber = Schema.Finite.pipe(Schema.nonNaN())

it.prop("symmetry", [realNumber, realNumber], ([a, b]) => a + b === b + a)

it.effect.prop("symmetry", [realNumber, realNumber], ([a, b]) =>
  Effect.gen(function* () {
    yield* Effect.void
    return a + b === b + a
  })
)

it.scoped.prop(
  "should detect the substring",
  { a: Schema.String, b: Schema.String, c: Schema.String },
  ({ a, b, c }) =>
    Effect.gen(function* () {
      yield* Effect.scope
      return (a + b + c).includes(b)
    })
)
```
