/**
 * Retries with the specified retry policy. Retries are done following the
 * failure of the original `io` (up to a fixed maximum with `once` or `recurs`
 * for example), so that that `io.retry(Schedule.once)` means "execute `io`
 * and in case of failure, try again once".
 *
 * @tsplus fluent ets/Effect retry
 */
export function retry_<R, E, A, S, R1, B>(
  self: Effect<R, E, A>,
  policy: LazyArg<Schedule<S, R1, E, B>>,
  __tsplusTrace?: string
): Effect<R & R1, E, A> {
  return self.retryOrElse(policy, (e, _) => Effect.fail(e))
}

/**
 * Retries with the specified retry policy. Retries are done following the
 * failure of the original `io` (up to a fixed maximum with `once` or `recurs`
 * for example), so that that `io.retry(Schedule.once)` means "execute `io`
 * and in case of failure, try again once".
 *
 * @tsplus static ets/Effect/Aspects retry
 */
export function retry<S, R1, E, B>(
  policy: LazyArg<Schedule<S, R1, E, B>>,
  __tsplusTrace?: string
): <R, A>(self: Effect<R, E, A>) => Effect<R & R1, E, A> {
  return <R, A>(self: Effect<R, E, A>): Effect<R & R1, E, A> => self.retry(policy)
}
