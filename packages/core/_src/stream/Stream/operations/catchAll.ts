/**
 * Switches over to the stream produced by the provided function in case this
 * one fails with a typed error.
 *
 * @tsplus static effect/core/stream/Stream.Aspects catchAll
 * @tsplus pipeable effect/core/stream/Stream catchAll
 */
export function catchAll<E, R2, E2, A2>(
  f: (e: E) => Stream<R2, E2, A2>
) {
  return <R, A>(self: Stream<R, E, A>): Stream<R | R2, E2, A | A2> =>
    self.catchAllCause((cause) =>
      cause.failureOrCause.fold(f, (cause) => Stream.failCauseSync(cause))
    )
}
