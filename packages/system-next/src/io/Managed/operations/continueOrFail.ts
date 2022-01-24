import * as O from "../../../data/Option"
import type { Managed } from "../definition"
import { continueOrFailManaged_ } from "./continueOrFailManaged"
import { succeedNow } from "./succeedNow"

/**
 * Fail with `e` if the supplied `PartialFunction` does not match, otherwise
 * succeed with the returned value.
 */
export function continueOrFail_<R, E, A, E1, A2>(
  self: Managed<R, E, A>,
  e: () => E1,
  pf: (a: A) => O.Option<A2>,
  __trace?: string
): Managed<R, E | E1, A2> {
  return continueOrFailManaged_(self, e, (a) => O.map_(pf(a), succeedNow), __trace)
}

/**
 * Evaluate each effect in the structure from left to right, collecting the
 * the successful values and discarding the empty cases. For a parallel version,
 * see `collectPar`.
 *
 * @ets_data_first continueOrFail_
 */
export function continueOrFail<E1, A, A2>(
  e: () => E1,
  pf: (a: A) => O.Option<A2>,
  __trace?: string
) {
  return <R, E>(self: Managed<R, E, A>): Managed<R, E | E1, A2> =>
    continueOrFail_(self, e, pf, __trace)
}
