import { Schema } from "@effect/schema"
import { Effect } from "effect"
import { prop } from "@effect/vitest/Schema"

// property testing

const realNumber = Schema.Finite.pipe(Schema.nonNaN())

prop("symmetry", [realNumber, realNumber], ([a, b]) => a + b === b + a)

prop.effect("symmetry", [realNumber, realNumber], ([a, b]) =>
  Effect.gen(function*() {
    yield* Effect.void
    return a + b === b + a
  }))

prop.scoped(
  "should detect the substring",
  { a: Schema.String, b: Schema.String, c: Schema.String },
  ({ a, b, c }) =>
    Effect.gen(function*() {
      yield* Effect.scope
      return (a + b + c).includes(b)
    })
)
