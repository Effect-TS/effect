/**
 * Keeps some of the errors, and terminates the fiber with the rest.
 *
 * @tsplus static effect/core/stream/Stream.Aspects refineOrDie
 * @tsplus pipeable effect/core/stream/Stream refineOrDie
 */
export function refineOrDie<E, E2>(pf: (e: E) => Maybe<E2>) {
  return <R, A>(self: Stream<R, E, A>): Stream<R, E2, A> => self.refineOrDieWith(pf, identity)
}
