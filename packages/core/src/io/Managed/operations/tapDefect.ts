import type { Cause } from "../../Cause"
import { stripFailures } from "../../Cause/operations/stripFailures"
import { Managed } from "../definition"

/**
 * Returns an effect that effectually "peeks" at the defect of the acquired
 * resource.
 *
 * @tsplus fluent ets/Managed tapDefect
 */
export function tapDefect_<R, E, A, R1, E1, X>(
  self: Managed<R, E, A>,
  f: (cause: Cause<never>) => Managed<R1, E1, X>,
  __tsplusTrace?: string
): Managed<R & R1, E | E1, A> {
  return self.catchAllCause((cause) =>
    f(stripFailures(cause)).flatMap(() => Managed.failCauseNow(cause))
  )
}

export function tapDefect<R1, E1, X>(
  f: (cause: Cause<never>) => Managed<R1, E1, X>,
  __tsplusTrace?: string
) {
  return <R, E, A>(self: Managed<R, E, A>): Managed<R & R1, E | E1, A> =>
    tapDefect_(self, f)
}
