import * as O from "../../../data/Option"
import { Effect } from "../definition"

/**
 * Keeps some of the errors, and terminates the fiber with the rest, using
 * the specified function to convert the `E` into a `Throwable`.
 *
 * @tsplus fluent ets/Effect refineOrDieWith
 */
export function refineOrDieWith_<R, A, E, E1>(
  self: Effect<R, E, A>,
  pf: (e: E) => O.Option<E1>,
  f: (e: E) => unknown,
  __etsTrace?: string
) {
  return self.catchAll((e) =>
    O.fold_(
      pf(e),
      () => Effect.dieNow(f(e)),
      (e1) => Effect.failNow(e1)
    )
  )
}

/**
 * Keeps some of the errors, and terminates the fiber with the rest, using
 * the specified function to convert the `E` into a `Throwable`.
 *
 * @ets_data_first refineOrDieWith_
 */
export function refineOrDieWith<E, E1>(
  pf: (e: E) => O.Option<E1>,
  f: (e: E) => unknown,
  __etsTrace?: string
) {
  return <R, A>(self: Effect<R, E, A>) => refineOrDieWith_(self, pf, f)
}
