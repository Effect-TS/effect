import type { Option } from "../../../data/Option"
import type { Managed } from "../definition"
import { asSome } from "./asSome"
import { chain_ } from "./chain"
import { none } from "./none"
import { suspend } from "./suspend"

/**
 * Runs `onTrue` if the result of `b` is `true` and `onFalse` otherwise.
 */
export function ifManaged_<R, E, A, R2, E2>(
  self: Managed<R, E, A>,
  b: () => Managed<R2, E2, boolean>,
  __trace?: string
): Managed<R & R2, E | E2, Option<A>> {
  return suspend(() => chain_(b(), (result) => (result ? asSome(self) : none)), __trace)
}

/**
 * Runs `onTrue` if the result of `b` is `true` and `onFalse` otherwise.
 *
 * @ets_data_first ifManaged_
 */
export function ifManaged<R2, E2>(b: () => Managed<R2, E2, boolean>, __trace?: string) {
  return <R, E, A>(self: Managed<R, E, A>): Managed<R & R2, E | E2, Option<A>> =>
    ifManaged_(self, b, __trace)
}
