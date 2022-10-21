/**
 * Takes some fiber failures and converts them into errors.
 *
 * @tsplus static effect/core/io/Effect.Aspects unrefine
 * @tsplus pipeable effect/core/io/Effect unrefine
 */
export function unrefine<E1>(
  pf: (u: unknown) => Maybe<E1>
) {
  return <R, E, A>(self: Effect<R, E, A>): Effect<R, E | E1, A> => self.unrefineWith(pf, identity)
}
