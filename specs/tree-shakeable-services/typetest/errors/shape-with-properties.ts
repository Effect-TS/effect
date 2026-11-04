// A shape with properties is rejected: an operation is a bare function. Properties belong on a separate service.
import * as Context from "effect/Context"
import type * as Effect from "effect/Effect"

export const double = Context.Operation<{ (n: number): Effect.Effect<number>; readonly label: string }>()(
  "test/double"
)
