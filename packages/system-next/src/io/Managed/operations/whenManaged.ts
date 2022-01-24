import type { Option } from "../../../data/Option"
import type { Managed } from "../definition"
import { asSome } from "./asSome"
import { chain_ } from "./chain"
import { none } from "./none"
import { suspend } from "./suspend"

/**
 * The moral equivalent of `if (p) exp` when `p` has side-effects
 */
export function whenManaged_<R, E, A, R1, E1>(
  self: Managed<R, E, A>,
  b: () => Managed<R1, E1, boolean>,
  __trace?: string
): Managed<R & R1, E | E1, Option<A>> {
  return suspend(() => chain_(b(), (result) => (result ? asSome(self) : none), __trace))
}

/**
 * The moral equivalent of `if (p) exp` when `p` has side-effects
 *
 * @ets_data_first whenManaged_
 */
export function whenManaged<R1, E1>(
  b: () => Managed<R1, E1, boolean>,
  __trace?: string
) {
  return <R, E, A>(self: Managed<R, E, A>): Managed<R & R1, E | E1, Option<A>> =>
    whenManaged_(self, b, __trace)
}
