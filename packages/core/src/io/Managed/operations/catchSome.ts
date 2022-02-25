import type { Option } from "../../../data/Option"
import { Managed } from "../definition"

/**
 * Recovers from some or all of the error cases.
 *
 * @tsplus fluent ets/Managed catchSome
 */
export function catchSome_<R, E, A, R1, E1, A1>(
  self: Managed<R, E, A>,
  pf: (e: E) => Option<Managed<R1, E1, A1>>,
  __tsplusTrace?: string
): Managed<R & R1, E | E1, A | A1> {
  return self.catchAll((e) => pf(e).getOrElse(Managed.failNow<E | E1>(e)))
}

/**
 * Recovers from some or all of the error cases.
 *
 * @ets_data_first catchSome_
 */
export function catchSome<E, R1, E1, A1>(
  pf: (e: E) => Option<Managed<R1, E1, A1>>,
  __tsplusTrace?: string
) {
  ;<R, A>(self: Managed<R, E, A>): Managed<R & R1, E | E1, A | A1> =>
    catchSome_(self, pf)
}
