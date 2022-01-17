import type { Option } from "../../Option"
import { getOrElse_ } from "../../Option"
import type { Managed } from "../definition"
import { chain_ } from "./chain"
import { fail } from "./fail"

/**
 * Fail with `e` if the supplied `PartialFunction` does not match, otherwise
 * continue with the returned value.
 */
export function continueOrFailManaged_<R, E, A, E1, R2, E2, A2>(
  self: Managed<R, E, A>,
  e: () => E1,
  pf: (a: A) => Option<Managed<R2, E2, A2>>,
  __trace?: string
): Managed<R & R2, E | E1 | E2, A2> {
  return chain_(
    self,
    (a): Managed<R2, E1 | E2, A2> => getOrElse_(pf(a), () => fail(e)),
    __trace
  )
}

/**
 * Fail with `e` if the supplied `PartialFunction` does not match, otherwise
 * continue with the returned value.
 *
 * @ets_data_first continueOrFailManaged_
 */
export function continueOrFailManaged<R1, E1, A1, A>(
  e: () => E1,
  pf: (a: A) => Option<Managed<R1, E1, A1>>,
  __trace?: string
) {
  return <R, E>(self: Managed<R, E, A>): Managed<R & R1, E | E1, A1> =>
    continueOrFailManaged_(self, e, pf, __trace)
}
