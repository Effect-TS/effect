import { Schema } from "@effect/schema"
import type { Unify } from "effect"
import { Effect } from "effect"

class Err extends Schema.TaggedError<Err>()("Err", {}) {}

// $ExpectType Err
export type IdErr = Unify.Unify<Err>

// $ExpectType Effect<never, Err, never>
export const YieldErr = Effect.gen(function*($) {
  return yield* $(new Err())
})
