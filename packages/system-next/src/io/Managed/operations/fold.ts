import { Managed } from "../definition"

/**
 * Folds over the failure value or the success value to yield an effect that
 * does not fail, but succeeds with the value returned by the left or right
 * function passed to `fold`.
 *
 * @ets fluent ets/Managed fold
 */
export function fold_<R, E, A, A2, A3>(
  self: Managed<R, E, A>,
  onFail: (e: E) => A2,
  onSuccess: (a: A) => A3,
  __etsTrace?: string
): Managed<R, never, A2 | A3> {
  return self.foldManaged(
    (e) => Managed.succeedNow(onFail(e)),
    (a) => Managed.succeedNow(onSuccess(a))
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
  __etsTrace?: string
) {
  return <R>(self: Managed<R, E, A>): Managed<R, never, A2 | A3> =>
    fold_(self, onFail, onSuccess)
}
