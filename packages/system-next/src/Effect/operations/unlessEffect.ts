import type * as O from "../../Option"
import type { Effect } from "../definition"
import { asSome } from "./asSome"
import { chain_ } from "./chain"
import { none } from "./none"
import { suspendSucceed } from "./suspendSucceed"

/**
 * The moral equivalent of `if (!p) exp` when `p` has side-effects.
 */
export function unlessEffect_<R, E, A, R2, E2>(
  self: Effect<R, E, A>,
  predicate: () => Effect<R2, E2, boolean>,
  __trace?: string
): Effect<R & R2, E | E2, O.Option<A>> {
  return suspendSucceed(
    () => chain_(predicate(), (b) => (b ? none : asSome(self))),
    __trace
  )
}

/**
 * The moral equivalent of `if (!p) exp` when `p` has side-effects.
 *
 * @ets_data_first unlessEffect_
 */
export function unlessEffect<R2, E2>(
  predicate: () => Effect<R2, E2, boolean>,
  __trace?: string
) {
  return <R, E, A>(self: Effect<R, E, A>): Effect<R & R2, E | E2, O.Option<A>> =>
    unlessEffect_(self, predicate, __trace)
}
