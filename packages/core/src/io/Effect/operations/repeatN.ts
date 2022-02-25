import { Effect } from "../definition"

/**
 * Returns a new effect that repeats this effect the specified number of times
 * or until the first failure. Repeats are in addition to the first execution,
 * so that `io.repeatN(1)` yields an effect that executes `io`, and then if
 * that succeeds, executes `io` an additional time.
 *
 * @tsplus fluent ets/Effect repeatN
 */
export function repeatN_<R, E, A>(
  self: Effect<R, E, A>,
  n: number,
  __tsplusTrace?: string
): Effect<R, E, A> {
  return Effect.suspendSucceed(() => {
    function loop(n: number): Effect<R, E, A> {
      return self.flatMap((a) =>
        n <= 0 ? Effect.succeedNow(a) : Effect.yieldNow > loop(n - 1)
      )
    }
    return loop(n)
  })
}

/**
 * Returns a new effect that repeats this effect the specified number of times
 * or until the first failure. Repeats are in addition to the first execution,
 * so that `io.repeatN(1)` yields an effect that executes `io`, and then if
 * that succeeds, executes `io` an additional time.
 *
 * @ets_data_first repeatN_
 */
export function repeatN(n: number, __tsplusTrace?: string) {
  return <R, E, A>(self: Effect<R, E, A>): Effect<R, E, A> => self.repeatN(n)
}
