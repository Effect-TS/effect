import { MVarInternal } from "@effect/core/concurrent/MVar/definition"
import * as Option from "@fp-ts/data/Option"

/**
 * Create an `MVar` which contains the supplied value.
 *
 * @tsplus static effect/core/concurrent/MVar.Ops __call
 * @tsplus static effect/core/concurrent/MVar.Ops make
 * @category constructors
 * @since 1.0.0
 */
export function make<A>(value: A): Effect<never, never, MVar<A>> {
  return TRef.make(Option.some(value)).map((tRef) => new MVarInternal(tRef)).commit
}
