/**
 * Returns an effect that effectfully "peeks" at the failure or success of
 * this effect.
 *
 * @tsplus static effect/core/io/Effect.Aspects tapBoth
 * @tsplus pipeable effect/core/io/Effect tapBoth
 * @category sequencing
 * @since 1.0.0
 */
export function tapBoth<E, A, R2, E2, X, R3, E3, X1>(
  f: (e: E) => Effect<R2, E2, X>,
  g: (a: A) => Effect<R3, E3, X1>
) {
  return <R>(self: Effect<R, E, A>): Effect<R | R2 | R3, E | E2 | E3, A> =>
    self.foldCauseEffect(
      (cause) => {
        const either = cause.failureOrCause
        switch (either._tag) {
          case "Left": {
            return f(either.left).zipRight(Effect.failCause(cause))
          }
          case "Right": {
            return Effect.failCause(cause)
          }
        }
      },
      (a) => g(a).as(a)
    )
}
