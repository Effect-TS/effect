// A generic shape whose type parameter appears in its result must name its key, otherwise the derived
// signature would instantiate the parameter at its constraint. The definition is rejected.
import * as Context from "effect/Context"
import type * as Effect from "effect/Effect"

export const parse = Context.Operation<<A>(decode: (input: string) => A, input: string) => Effect.Effect<A>>()(
  "test/parse"
)
