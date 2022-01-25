import type { IO } from "../definition"
import { fail } from "./fail"
import { succeed } from "./succeed"
import { suspendSucceed } from "./suspendSucceed"

/**
 * Evaluate the predicate, return the given `A` as success if predicate returns
 * true, and the given `E` as error otherwise
 *
 * For effectful conditionals, see `ifEffect`.
 *
 * @ets static ets/EffectOps cond
 */
export function cond_<E, A>(
  predicate: () => boolean,
  result: () => A,
  error: () => E,
  __etsTrace?: string
): IO<E, A> {
  return suspendSucceed(() => (predicate() ? succeed(result) : fail(error)), __etsTrace)
}

/**
 * Evaluate the predicate, return the given `A` as success if predicate returns
 * true, and the given `E` as error otherwise
 *
 * For effectful conditionals, see `ifEffect`.
 *
 * @ets_data_first cond_
 */
export function cond<E, A>(result: () => A, error: () => E, __etsTrace?: string) {
  return (predicate: () => boolean): IO<E, A> =>
    cond_(predicate, result, error, __etsTrace)
}
