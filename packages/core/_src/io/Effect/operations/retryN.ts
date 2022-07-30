/**
 * Retries this effect the specified number of times.
 *
 * @tsplus static effect/core/io/Effect.Aspects retryN
 * @tsplus pipeable effect/core/io/Effect retryN
 */
export function retryN(n: number, __tsplusTrace?: string) {
  return <R, E, A>(self: Effect<R, E, A>): Effect<R, E, A> => Effect.suspendSucceed(retryNLoop(self, n))
}

function retryNLoop<R, E, A>(
  self: Effect<R, E, A>,
  n: number,
  __tsplusTrace?: string
): Effect<R, E, A> {
  return self.catchAll((e) => n < 0 ? Effect.failSync(e) : Effect.yieldNow > retryNLoop(self, n - 1))
}
