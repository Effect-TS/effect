import { identity } from "@fp-ts/data/Function"
import type { Option } from "@fp-ts/data/Option"

/**
 * Keeps some of the errors, and terminates the fiber with the rest.
 *
 * @tsplus static effect/core/stream/Stream.Aspects refineOrDie
 * @tsplus pipeable effect/core/stream/Stream refineOrDie
 * @category mutations
 * @since 1.0.0
 */
export function refineOrDie<E, E2>(pf: (e: E) => Option<E2>) {
  return <R, A>(self: Stream<R, E, A>): Stream<R, E2, A> => self.refineOrDieWith(pf, identity)
}
