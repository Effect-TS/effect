import type { Option } from "../../../data/Option"
import type { Managed } from "../definition"
import { asSome } from "./asSome"
import { chain_ } from "./chain"
import { none } from "./none"
import { suspend } from "./suspend"

/**
 * The moral equivalent of `if (!p) exp` when `p` has side-effects.
 */
export function unlessManaged_<R, E, A, R2, E2>(
  self: Managed<R, E, A>,
  b: () => Managed<R2, E2, boolean>,
  __trace?: string
): Managed<R & R2, E | E2, Option<A>> {
  return suspend(() => chain_(b(), (result) => (result ? none : asSome(self))), __trace)
}

/**
 * The moral equivalent of `if (!p) exp` when `p` has side-effects.
 *
 * @ets_data_first unlessManaged_
 */
export function unlessManaged<R2, E2>(
  b: () => Managed<R2, E2, boolean>,
  __trace?: string
) {
  return <R, E, A>(self: Managed<R, E, A>): Managed<R & R2, E | E2, Option<A>> =>
    unlessManaged_(self, b, __trace)
}
