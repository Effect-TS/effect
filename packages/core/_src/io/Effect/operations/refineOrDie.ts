/**
 * Keeps some of the errors, and terminates the fiber with the rest
 *
 * @tsplus static effect/core/io/Effect.Aspects refineOrDie
 * @tsplus pipeable effect/core/io/Effect refineOrDie
 */
export function refineOrDie<E, E1>(
  pf: (e: E) => Maybe<E1>,
  __tsplusTrace?: string
) {
  return <R, A>(self: Effect<R, E, A>): Effect<R, E1, A> => self.refineOrDieWith(pf, identity)
}
