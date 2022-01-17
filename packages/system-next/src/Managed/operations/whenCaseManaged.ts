import type * as O from "../../Option"
import type { Managed } from "../definition"
import { chain_ } from "./chain"
import { suspend } from "./suspend"
import { whenCase } from "./whenCase"

/**
 * Runs an effect when the supplied `PartialFunction` matches for the given
 * effectful value, otherwise does nothing.
 */
export function whenCaseManaged_<R, E, A, B>(
  managed: Managed<R, E, A>,
  pf: (a: A) => O.Option<Managed<R, E, B>>,
  __trace?: string
): Managed<R, E, O.Option<B>> {
  return suspend(() => chain_(managed, whenCase(pf)), __trace)
}

/**
 * Runs an effect when the supplied `PartialFunction` matches for the given
 * effectful value, otherwise does nothing.
 *
 * @ets_data_first whenCaseManaged_
 */
export function whenCaseManaged<R, E, A, B>(
  pf: (a: A) => O.Option<Managed<R, E, B>>,
  __trace?: string
) {
  return (managed: Managed<R, E, A>): Managed<R, E, O.Option<B>> =>
    whenCaseManaged_(managed, pf, __trace)
}
