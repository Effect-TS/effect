/**
 * The same as `timeout`, but instead of producing a `None` in the event of
 * timeout, it will produce the specified failure.
 *
 * @tsplus fluent ets/Effect timeoutFailCause
 */
export function timeoutFailCause_<R, E, E1, A>(
  self: Effect<R, E, A>,
  cause: LazyArg<Cause<E1>>,
  duration: LazyArg<Duration>,
  __tsplusTrace?: string
): Effect<R, E | E1, A> {
  return self.timeoutTo(Effect.failCause(cause), Effect.succeedNow, duration).flatten()
}

/**
 * The same as `timeout`, but instead of producing a `None` in the event of
 * timeout, it will produce the specified failure.
 *
 * @tsplus static ets/Effect/Aspects timeoutFailCause
 */
export const timeoutFailCause = Pipeable(timeoutFailCause_)
