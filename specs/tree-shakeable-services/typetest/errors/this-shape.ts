// A shape declaring `this` is rejected: an operation passes no receiver, so an implementation's `this` is the
// object that provides it, never the caller's.
import * as Context from "effect/Context"
import type * as Effect from "effect/Effect"

export const greet = Context.Operation<(this: { readonly prefix: string }, name: string) => Effect.Effect<string>>()(
  "test/greet"
)
