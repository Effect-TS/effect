import { MVarInternal } from "@effect/core/concurrent/MVar/definition"

/**
 * Create an `MVar` which contains the supplied value.
 *
 * @tsplus static effect/core/concurrent/MVar.Ops __call
 * @tsplus static effect/core/concurrent/MVar.Ops make
 */
export function make<A>(value: A): Effect<never, never, MVar<A>> {
  return TRef.make(Maybe.some(value)).map((tRef) => new MVarInternal(tRef)).commit
}
