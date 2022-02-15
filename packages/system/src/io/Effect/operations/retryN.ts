import { Effect } from "../definition"

/**
 * Retries this effect the specified number of times.
 *
 * @tsplus fluent ets/Effect retryN
 */
export function retryN_<R, E, A>(
  self: Effect<R, E, A>,
  n: number,
  __etsTrace?: string
): Effect<R, E, A> {
  return Effect.suspendSucceed(retryNLoop(self, n))
}

/**
 * Retries this effect the specified number of times.
 *
 * @ets_data_first retryN_
 */
export function retryN(n: number, __etsTrace?: string) {
  return <R, E, A>(self: Effect<R, E, A>): Effect<R, E, A> => self.retryN(n)
}

function retryNLoop<R, E, A>(
  self: Effect<R, E, A>,
  n: number,
  __etsTrace?: string
): Effect<R, E, A> {
  return self.catchAll((e) =>
    n < 0 ? Effect.fail(e) : Effect.yieldNow > retryNLoop(self, n - 1)
  )
}
