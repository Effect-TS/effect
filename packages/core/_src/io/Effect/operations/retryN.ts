/**
 * Retries this effect the specified number of times.
 *
 * @tsplus fluent ets/Effect retryN
 */
export function retryN_<R, E, A>(
  self: Effect<R, E, A>,
  n: number,
  __tsplusTrace?: string
): Effect<R, E, A> {
  return Effect.suspendSucceed(retryNLoop(self, n))
}

/**
 * Retries this effect the specified number of times.
 *
 * @tsplus static ets/Effect/Aspects retryN
 */
export const retryN = Pipeable(retryN_)

function retryNLoop<R, E, A>(
  self: Effect<R, E, A>,
  n: number,
  __tsplusTrace?: string
): Effect<R, E, A> {
  return self.catchAll((e) => n < 0 ? Effect.fail(e) : Effect.yieldNow > retryNLoop(self, n - 1))
}
