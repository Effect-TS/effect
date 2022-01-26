import type * as O from "../../../data/Option"
import { Managed } from "../definition"

/**
 * Runs an effect when the supplied `PartialFunction` matches for the given
 * effectful value, otherwise does nothing.
 *
 * @ets static ets/Managed whenCaseManaged
 */
export function whenCaseManaged_<R, E, A, B>(
  managed: Managed<R, E, A>,
  pf: (a: A) => O.Option<Managed<R, E, B>>,
  __etsTrace?: string
): Managed<R, E, O.Option<B>> {
  return Managed.suspend(managed.flatMap((a) => Managed.whenCase(a, pf)))
}

/**
 * Runs an effect when the supplied `PartialFunction` matches for the given
 * effectful value, otherwise does nothing.
 *
 * @ets_data_first whenCaseManaged_
 */
export function whenCaseManaged<R, E, A, B>(
  pf: (a: A) => O.Option<Managed<R, E, B>>,
  __etsTrace?: string
) {
  return (managed: Managed<R, E, A>): Managed<R, E, O.Option<B>> =>
    whenCaseManaged_(managed, pf)
}
