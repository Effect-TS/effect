import type { LazyArg } from "../../../data/Function"
import type { Option } from "../../../data/Option"
import { getOrElse_ } from "../../../data/Option"
import { Managed } from "../definition"

/**
 * Fail with `e` if the supplied `PartialFunction` does not match, otherwise
 * continue with the returned value.
 *
 * @ets fluent ets/Managed continueOrFailManaged
 */
export function continueOrFailManaged_<R, E, A, E1, R2, E2, A2>(
  self: Managed<R, E, A>,
  e: LazyArg<E1>,
  pf: (a: A) => Option<Managed<R2, E2, A2>>,
  __etsTrace?: string
): Managed<R & R2, E | E1 | E2, A2> {
  return self.flatMap(
    (a): Managed<R2, E1 | E2, A2> => getOrElse_(pf(a), () => Managed.fail(e))
  )
}

/**
 * Fail with `e` if the supplied `PartialFunction` does not match, otherwise
 * continue with the returned value.
 *
 * @ets_data_first continueOrFailManaged_
 */
export function continueOrFailManaged<R1, E1, A1, A>(
  e: LazyArg<E1>,
  pf: (a: A) => Option<Managed<R1, E1, A1>>,
  __etsTrace?: string
) {
  return <R, E>(self: Managed<R, E, A>): Managed<R & R1, E | E1, A1> =>
    continueOrFailManaged_(self, e, pf)
}
