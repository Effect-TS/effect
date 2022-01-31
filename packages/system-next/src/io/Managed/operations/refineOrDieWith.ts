import type { Option } from "../../../data/Option"
import { Managed } from "../definition"

/**
 * Keeps some of the errors, and terminates the fiber with the rest, using
 * the specified function to convert the `E` into an `unknown`.
 *
 * @ets fluent ets/Managed refineOrDieWith
 */
export function refineOrDieWith_<R, A, E, E1>(
  self: Managed<R, E, A>,
  pf: (e: E) => Option<E1>,
  f: (e: E) => unknown,
  __etsTrace?: string
) {
  return self.catchAll((e) =>
    pf(e).fold(
      () => Managed.dieNow(f(e)),
      (e1) => Managed.failNow(e1)
    )
  )
}

/**
 * Keeps some of the errors, and terminates the fiber with the rest, using
 * the specified function to convert the `E` into an `unknown`.
 *
 * @ets_data_first refineOrDieWith_
 */
export function refineOrDieWith<E, E1>(
  pf: (e: E) => Option<E1>,
  f: (e: E) => unknown,
  __etsTrace?: string
) {
  return <R, A>(self: Managed<R, E, A>) => refineOrDieWith_(self, pf, f)
}
