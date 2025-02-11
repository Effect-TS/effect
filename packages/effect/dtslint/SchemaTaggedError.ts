import type { Unify } from "effect"
import { Effect, Schema } from "effect"

class Err extends Schema.TaggedError<Err>()("Err", {}) {}

// $ExpectType Err
export type IdErr = Unify.Unify<Err>

// $ExpectType Effect<never, Err, never>
export const YieldErr = Effect.gen(function*($) {
  return yield* $(new Err())
})

// ---------------------------------------------
// Annotations as tuple
// ---------------------------------------------

// @ts-expect-error
export class Annotations extends Schema.TaggedError<Annotations>()("Annotations", {
  id: Schema.Number
}, [
  undefined,
  undefined,
  {
    pretty: () =>
    (
      _x // $ExpectType { readonly _tag: "Annotations"; } & { readonly id: number; }
    ) => ""
  }
]) {}
