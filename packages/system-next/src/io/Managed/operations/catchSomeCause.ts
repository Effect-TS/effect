import type { Cause } from "../../Cause"
import * as O from "../../../data/Option"
import type { Managed } from "../definition"
import { catchAllCause_ } from "./catchAllCause"
import { failCause } from "./failCause"

/**
 * Recovers from some or all of the error Causes.
 */
export function catchSomeCause_<R, E, A, R1, E1, A1>(
  self: Managed<R, E, A>,
  pf: (cause: Cause<E>) => O.Option<Managed<R1, E1, A1>>,
  __trace?: string
): Managed<R & R1, E | E1, A | A1> {
  return catchAllCause_(
    self,
    (e) => O.getOrElse_(pf(e), () => failCause<E | E1>(e)),
    __trace
  )
}

/**
 * Recovers from some or all of the error Causes.
 *
 * @ets_data_first catchSomeCause_
 */
export function catchSomeCause<E, R1, E1, A1>(
  pf: (cause: Cause<E>) => O.Option<Managed<R1, E1, A1>>,
  __trace?: string
) {
  return <R, A>(self: Managed<R, E, A>): Managed<R & R1, E | E1, A | A1> =>
    catchSomeCause_(self, pf, __trace)
}
