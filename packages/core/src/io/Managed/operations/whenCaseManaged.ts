import type { LazyArg } from "../../../data/Function"
import type { Option } from "../../../data/Option"
import { Managed } from "../definition"

/**
 * Runs an effect when the supplied `PartialFunction` matches for the given
 * effectful value, otherwise does nothing.
 *
 * @tsplus static ets/Managed whenCaseManaged
 */
export function whenCaseManaged<R, E, A, B>(
  managed: LazyArg<Managed<R, E, A>>,
  pf: (a: A) => Option<Managed<R, E, B>>,
  __tsplusTrace?: string
): Managed<R, E, Option<B>> {
  return Managed.suspend(managed().flatMap((a) => Managed.whenCase(a, pf)))
}
