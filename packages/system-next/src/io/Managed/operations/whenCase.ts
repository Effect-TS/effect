import * as O from "../../../data/Option"
import type { Managed } from "../definition"
import { asSome } from "./asSome"
import { none } from "./none"
import { suspend } from "./suspend"

/**
 * Runs an effect when the supplied `PartialFunction` matches for the given
 * value, otherwise does nothing.
 */
export function whenCase_<R, E, A, B>(
  a: A,
  pf: (a: A) => O.Option<Managed<R, E, B>>,
  __trace?: string
): Managed<R, E, O.Option<B>> {
  return suspend(() => O.fold_(pf(a), () => none, asSome), __trace)
}

/**
 * Runs an effect when the supplied `PartialFunction` matches for the given
 * value, otherwise does nothing.
 *
 * @ets_data_first whenCase_
 */
export function whenCase<R, E, A, B>(
  pf: (a: A) => O.Option<Managed<R, E, B>>,
  __trace?: string
) {
  return (a: A): Managed<R, E, O.Option<B>> => whenCase_(a, pf, __trace)
}
