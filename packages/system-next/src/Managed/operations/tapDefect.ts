// ets_tracing: off

import type { Cause } from "../../Cause"
import { stripFailures } from "../../Cause/operations/stripFailures"
import type { Managed } from "../definition"
import { catchAllCause_ } from "./catchAllCause"
import { chain_ } from "./chain"
import { failCause } from "./failCause"

/**
 * Returns an effect that effectually "peeks" at the defect of the acquired
 * resource.
 */
export function tapDefect_<R, E, A, R1, E1, X>(
  self: Managed<R, E, A>,
  f: (cause: Cause<never>) => Managed<R1, E1, X>,
  __trace?: string
): Managed<R & R1, E | E1, A> {
  return catchAllCause_(
    self,
    (cause) => chain_(f(stripFailures(cause)), () => failCause(cause)),
    __trace
  )
}

export function tapDefect<R1, E1, X>(
  f: (cause: Cause<never>) => Managed<R1, E1, X>,
  __trace?: string
) {
  return <R, E, A>(self: Managed<R, E, A>): Managed<R & R1, E | E1, A> =>
    tapDefect_(self, f, __trace)
}
