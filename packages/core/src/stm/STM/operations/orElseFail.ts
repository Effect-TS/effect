import type { LazyArg } from "../../../data/Function"
import { STM } from "../definition"

/**
 * Tries this effect first, and if it fails or retries, fails with the
 * specified error.
 *
 * @tsplus fluent ets/STM orElseFail
 */
export function orElseFail_<R, E, E1, A>(
  self: STM<R, E, A>,
  e: LazyArg<E1>
): STM<R, E | E1, A> {
  return self | STM.fail(e)
}

/**
 * Tries this effect first, and if it fails or retries, fails with the
 * specified error.
 *
 * @ets_data_first orElseFail_
 */
export function orElseFail<E1>(e: LazyArg<E1>) {
  return <R, E, A>(self: STM<R, E, A>): STM<R, E | E1, A> => self.orElseFail(e)
}
