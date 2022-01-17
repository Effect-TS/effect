import * as O from "../../Option"
import type { Managed } from "../definition"
import { catchAll_ } from "./catchAll"
import { failNow } from "./failNow"

/**
 * Recovers from some or all of the error cases.
 */
export function catchSome_<R, E, A, R1, E1, A1>(
  self: Managed<R, E, A>,
  pf: (e: E) => O.Option<Managed<R1, E1, A1>>,
  __trace?: string
): Managed<R & R1, E | E1, A | A1> {
  return catchAll_(self, (e) => O.getOrElse_(pf(e), () => failNow<E | E1>(e)), __trace)
}

/**
 * Recovers from some or all of the error cases.
 *
 * @ets_data_first catchSome_
 */
export function catchSome<E, R1, E1, A1>(
  pf: (e: E) => O.Option<Managed<R1, E1, A1>>,
  __trace?: string
) {
  ;<R, A>(self: Managed<R, E, A>): Managed<R & R1, E | E1, A | A1> =>
    catchSome_(self, pf, __trace)
}
