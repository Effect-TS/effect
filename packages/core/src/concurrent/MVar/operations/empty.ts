import { MVarInternal } from "@effect/core/concurrent/MVar/definition"
import * as Option from "@fp-ts/data/Option"

/**
 * Creates an `MVar` which is initially empty.
 *
 * @tsplus static effect/core/concurrent/MVar.Ops empty
 * @category constructors
 * @since 1.0.0
 */
export function empty<A>(): Effect<never, never, MVar<A>> {
  return TRef.make(Option.none as Option.Option<A>).map((tRef) => new MVarInternal(tRef)).commit
}
