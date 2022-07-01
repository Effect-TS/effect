import { MVarInternal } from "@effect/core/concurrent/MVar/definition"

/**
 * Creates an `MVar` which is initially empty.
 *
 * @tsplus static effect/core/concurrent/MVar.Ops empty
 */
export function empty<A>(): Effect<never, never, MVar<A>> {
  return TRef.make(Maybe.emptyOf<A>()).map((tRef) => new MVarInternal(tRef)).commit
}
