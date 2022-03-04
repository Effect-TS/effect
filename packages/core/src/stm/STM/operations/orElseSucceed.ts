import type { LazyArg } from "../../../data/Function"
import { STM } from "../definition"

/**
 * Tries this effect first, and if it fails or retries, succeeds with the
 * specified value.
 *
 * @tsplus fluent ets/STM orElseSucceed
 */
export function orElseSucceed_<R, E, A, A1>(
  self: STM<R, E, A>,
  a: LazyArg<A1>
): STM<R, E, A | A1> {
  return self | STM.succeed(a)
}

/**
 * Tries this effect first, and if it fails or retries, succeeds with the
 * specified value.
 *
 * @ets_data_first orElseSucceed_
 */
export function orElseSucceed<A1>(a: LazyArg<A1>) {
  return <R, E, A>(self: STM<R, E, A>): STM<R, E, A | A1> => self.orElseSucceed(a)
}
