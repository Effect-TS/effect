import type { Effect, RIO } from "../definition"
import { foldEffect_ } from "./foldEffect"
import { succeedNow } from "./succeedNow"

/**
 * Folds over the failure value or the success value to yield an effect that
 * does not fail, but succeeds with the value returned by the left or right
 * function passed to `fold`.
 */
export function fold_<R, E, A, A2, A3>(
  self: Effect<R, E, A>,
  failure: (e: E) => A2,
  success: (a: A) => A3,
  __trace?: string
): RIO<R, A2 | A3> {
  return foldEffect_(
    self,
    (e) => succeedNow(failure(e)),
    (a) => succeedNow(success(a)),
    __trace
  )
}

/**
 * Folds over the failure value or the success value to yield an effect that
 * does not fail, but succeeds with the value returned by the left or right
 * function passed to `fold`.
 *
 * @ets_data_first fold_
 */
export function fold<E, A, A2, A3>(
  failure: (e: E) => A2,
  success: (a: A) => A3,
  __trace?: string
) {
  return <R>(self: Effect<R, E, A>): RIO<R, A2 | A3> =>
    fold_(self, failure, success, __trace)
}
