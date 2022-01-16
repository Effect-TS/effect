// ets_tracing: off

import type { Cause } from "../../Cause"
import type { Managed } from "../definition"
import { managedApply } from "../definition"
import * as T from "./_internal/effect"

/**
 * A more powerful version of `foldManaged` that allows recovering from any
 * kind of failure except interruptions.
 */
export function foldCauseManaged_<R, E, A, R1, E1, A1, R2, E2, A2>(
  self: Managed<R, E, A>,
  failure: (cause: Cause<E>) => Managed<R1, E1, A1>,
  success: (a: A) => Managed<R2, E2, A2>,
  __trace?: string
): Managed<R & R1 & R2, E1 | E2, A1 | A2> {
  return managedApply<R & R1 & R2, E1 | E2, A1 | A2>(
    T.foldCauseEffect_(
      self.effect,
      (cause) => failure(cause).effect,
      ({ tuple: [_, a] }) => success(a).effect,
      __trace
    )
  )
}

/**
 * A more powerful version of `foldManaged` that allows recovering from any
 * kind of failure except interruptions.
 *
 * @ets_data_first foldCauseManaged_
 */
export function foldCauseManaged<E, A, R1, E1, A1, R2, E2, A2>(
  failure: (cause: Cause<E>) => Managed<R1, E1, A1>,
  success: (a: A) => Managed<R2, E2, A2>,
  __trace?: string
) {
  return <R>(self: Managed<R, E, A>): Managed<R & R1 & R2, E1 | E2, A1 | A2> =>
    foldCauseManaged_(self, failure, success, __trace)
}
