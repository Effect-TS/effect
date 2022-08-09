/**
 * Retries with the specified schedule, until it fails, and then both the
 * value produced by the schedule together with the last error are passed to
 * the recovery function.
 *
 * @tsplus static effect/core/io/Effect.Aspects retryOrElse
 * @tsplus pipeable effect/core/io/Effect retryOrElse
 */
export function retryOrElse<S, R1, E, A1, R2, E2, A2>(
  policy: Schedule<S, R1, E, A1>,
  orElse: (e: E, out: A1) => Effect<R2, E2, A2>
) {
  return <R, A>(self: Effect<R, E, A>): Effect<R | R1 | R2, E | E2, A | A2> =>
    self.retryOrElseEither(policy, orElse).map((either) => either.merge)
}
