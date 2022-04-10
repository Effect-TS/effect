// ets_tracing: off

import type * as O from "../../Option"
import type { Effect } from "../definition"
import { asSome } from "./asSome"
import { none } from "./none"
import { suspendSucceed } from "./suspendSucceed"

/**
 * The moral equivalent of `if (!p) exp`
 */
export function unless_<R, E, A>(
  self: Effect<R, E, A>,
  predicate: () => boolean,
  __trace?: string
): Effect<R, E, O.Option<A>> {
  return suspendSucceed(() => (predicate() ? none : asSome(self)))
}

/**
 * The moral equivalent of `if (!p) exp`
 *
 * @ets_data_first unless_
 */
export function unless(predicate: () => boolean, __trace?: string) {
  return <R, E, A>(self: Effect<R, E, A>): Effect<R, E, O.Option<A>> =>
    unless_(self, predicate, __trace)
}
