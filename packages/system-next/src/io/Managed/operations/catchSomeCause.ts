import * as O from "../../../data/Option"
import type { Cause } from "../../Cause"
import { Managed } from "../definition"

/**
 * Recovers from some or all of the error causes.
 *
 * @ets fluent ets/Managed catchSomeCause
 */
export function catchSomeCause_<R, E, A, R1, E1, A1>(
  self: Managed<R, E, A>,
  pf: (cause: Cause<E>) => O.Option<Managed<R1, E1, A1>>,
  __etsTrace?: string
): Managed<R & R1, E | E1, A | A1> {
  return self.catchAllCause((e) =>
    O.getOrElse_(pf(e), () => Managed.failCause<E | E1>(e))
  )
}

/**
 * Recovers from some or all of the error Causes.
 *
 * @ets_data_first catchSomeCause_
 */
export function catchSomeCause<E, R1, E1, A1>(
  pf: (cause: Cause<E>) => O.Option<Managed<R1, E1, A1>>,
  __etsTrace?: string
) {
  return <R, A>(self: Managed<R, E, A>): Managed<R & R1, E | E1, A | A1> =>
    catchSomeCause_(self, pf)
}
