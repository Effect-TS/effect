import type { LazyArg } from "../../../data/Function"
import type { Option } from "../../../data/Option"
import { Managed } from "../definition"

/**
 * Fail with `e` if the supplied `PartialFunction` does not match, otherwise
 * succeed with the returned value.
 *
 * @tsplus fluent ets/Managed continueOrFail
 */
export function continueOrFail_<R, E, A, E1, A2>(
  self: Managed<R, E, A>,
  e: LazyArg<E1>,
  pf: (a: A) => Option<A2>,
  __etsTrace?: string
): Managed<R, E | E1, A2> {
  return self.continueOrFailManaged(e, (a) => pf(a).map(Managed.succeedNow))
}

/**
 * Evaluate each effect in the structure from left to right, collecting the
 * the successful values and discarding the empty cases. For a parallel version,
 * see `collectPar`.
 *
 * @ets_data_first continueOrFail_
 */
export function continueOrFail<E1, A, A2>(
  e: LazyArg<E1>,
  pf: (a: A) => Option<A2>,
  __etsTrace?: string
) {
  return <R, E>(self: Managed<R, E, A>): Managed<R, E | E1, A2> =>
    continueOrFail_(self, e, pf)
}
