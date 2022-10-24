import { pipe } from "@fp-ts/data/Function"
import * as HashSet from "@fp-ts/data/HashSet"
import * as Option from "@fp-ts/data/Option"

/**
 * Returns a set of interruptors, fibers that interrupted the fiber described
 * by this `Cause`.
 *
 * @tsplus getter effect/core/io/Cause interruptors
 * @category destructors
 * @since 1.0.0
 */
export function interruptors<E>(self: Cause<E>): HashSet.HashSet<FiberId> {
  return self.reduce(
    HashSet.empty<FiberId>(),
    (acc, curr) =>
      curr.isInterruptType() ?
        Option.some(pipe(acc, HashSet.add(curr.fiberId))) :
        Option.some(acc)
  )
}
