import * as O from "../../../data/Option"
import { Managed } from "../definition"

/**
 * Recovers from some or all of the error cases.
 *
 * @ets fluent ets/Managed catchSome
 */
export function catchSome_<R, E, A, R1, E1, A1>(
  self: Managed<R, E, A>,
  pf: (e: E) => O.Option<Managed<R1, E1, A1>>,
  __etsTrace?: string
): Managed<R & R1, E | E1, A | A1> {
  return self.catchAll((e) => O.getOrElse_(pf(e), () => Managed.failNow<E | E1>(e)))
}

/**
 * Recovers from some or all of the error cases.
 *
 * @ets_data_first catchSome_
 */
export function catchSome<E, R1, E1, A1>(
  pf: (e: E) => O.Option<Managed<R1, E1, A1>>,
  __etsTrace?: string
) {
  ;<R, A>(self: Managed<R, E, A>): Managed<R & R1, E | E1, A | A1> =>
    catchSome_(self, pf)
}
