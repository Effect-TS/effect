import type { Managed } from "../definition"
import { foldManaged_ } from "./foldManaged"
import { succeedNow } from "./succeedNow"

/**
 * Folds over the failure value or the success value to yield an effect that
 * does not fail, but succeeds with the value returned by the left or right
 * function passed to `fold`.
 */
export function fold_<R, E, A, A2, A3>(
  self: Managed<R, E, A>,
  onFail: (e: E) => A2,
  onSuccess: (a: A) => A3,
  __trace?: string
): Managed<R, never, A2 | A3> {
  return foldManaged_(
    self,
    (e) => succeedNow(onFail(e)),
    (a) => succeedNow(onSuccess(a)),
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
  onFail: (e: E) => A2,
  onSuccess: (a: A) => A3,
  __trace?: string
) {
  return <R>(self: Managed<R, E, A>): Managed<R, never, A2 | A3> =>
    fold_(self, onFail, onSuccess, __trace)
}
