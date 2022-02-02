import type { Cause } from "../../Cause"
import { Managed } from "../definition"

/**
 * A more powerful version of `foldManaged` that allows recovering from any
 * kind of failure except interruptions.
 *
 * @tsplus fluent ets/Managed foldCauseManaged
 */
export function foldCauseManaged_<R, E, A, R1, E1, A1, R2, E2, A2>(
  self: Managed<R, E, A>,
  failure: (cause: Cause<E>) => Managed<R1, E1, A1>,
  success: (a: A) => Managed<R2, E2, A2>,
  __etsTrace?: string
): Managed<R & R1 & R2, E1 | E2, A1 | A2> {
  return Managed<R & R1 & R2, E1 | E2, A1 | A2>(
    self.effect.foldCauseEffect(
      (cause) => failure(cause).effect,
      ({ tuple: [_, a] }) => success(a).effect
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
  __etsTrace?: string
) {
  return <R>(self: Managed<R, E, A>): Managed<R & R1 & R2, E1 | E2, A1 | A2> =>
    self.foldCauseManaged(failure, success)
}
