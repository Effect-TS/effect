/**
 * Switches over to the stream produced by the provided function in case this
 * one fails with some typed error.
 *
 * @tsplus static effect/core/stream/Stream.Aspects catchSome
 * @tsplus pipeable effect/core/stream/Stream catchSome
 */
export function catchSome<E, R2, E2, A2>(
  pf: (e: E) => Maybe<Stream<R2, E2, A2>>
) {
  return <R, A>(self: Stream<R, E, A>): Stream<R | R2, E | E2, A | A2> =>
    self.catchAll((e): Stream<R2, E | E2, A2> => pf(e).getOrElse(Stream.failSync(e)))
}
