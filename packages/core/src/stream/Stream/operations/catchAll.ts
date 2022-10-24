/**
 * Switches over to the stream produced by the provided function in case this
 * one fails with a typed error.
 *
 * @tsplus static effect/core/stream/Stream.Aspects catchAll
 * @tsplus pipeable effect/core/stream/Stream catchAll
 * @category alternatives
 * @since 1.0.0
 */
export function catchAll<E, R2, E2, A2>(
  f: (e: E) => Stream<R2, E2, A2>
) {
  return <R, A>(self: Stream<R, E, A>): Stream<R | R2, E2, A | A2> =>
    self.catchAllCause((cause) => {
      const either = cause.failureOrCause
      switch (either._tag) {
        case "Left": {
          return f(either.left)
        }
        case "Right": {
          return Stream.failCause(either.right)
        }
      }
    })
}
