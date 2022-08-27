/**
 * Retries with the specified retry policy. Retries are done following the
 * failure of the original `io` (up to a fixed maximum with `once` or `recurs`
 * for example), so that that `io.retry(Schedule.once)` means "execute `io`
 * and in case of failure, try again once".
 *
 * @tsplus static effect/core/io/Effect.Aspects retry
 * @tsplus pipeable effect/core/io/Effect retry
 */
export function retry<S, R1, E, B>(policy: Schedule<S, R1, E, B>) {
  return <R, A>(self: Effect<R, E, A>): Effect<R | R1, E, A> =>
    self.retryOrElse(policy, (e, _) => Effect.fail(e))
}
