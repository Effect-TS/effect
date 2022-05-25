/**
 * The same as `timeout`, but instead of producing a `None` in the event of
 * timeout, it will produce the specified error.
 *
 * @tsplus fluent ets/Effect timeoutFail
 */
export function timeoutFail_<R, E, E1, A>(
  self: Effect<R, E, A>,
  e: LazyArg<E1>,
  duration: LazyArg<Duration>,
  __tsplusTrace?: string
): Effect<R, E | E1, A> {
  return self.timeoutTo(Effect.fail(e), Effect.succeedNow, duration).flatten()
}

/**
 * The same as `timeout`, but instead of producing a `None` in the event of
 * timeout, it will produce the specified error.
 *
 * @tsplus static ets/Effect/Aspects timeoutFail
 */
export const timeoutFail = Pipeable(timeoutFail_)
