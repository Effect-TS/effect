import type { Tuple } from "../../Collections/Immutable/Tuple"
import type { Trace } from "../../Trace"
import type { Effect } from "../definition"
import { foldTraceEffect_ } from "./foldTraceEffect"
import { succeedNow } from "./succeedNow"

/**
 * A version of `catchAll` that gives you the (optional) trace of the error.
 */
export function catchAllTrace_<R, E, A, R2, E2, A2>(
  self: Effect<R, E, A>,
  h: (tuple: Tuple<[E, Trace]>) => Effect<R2, E2, A2>,
  __trace?: string
): Effect<R & R2, E2, A | A2> {
  return foldTraceEffect_(self, h, succeedNow, __trace)
}

/**
 * A version of `catchAll` that gives you the (optional) trace of the error.
 *
 * @ets_data_first catchAllTrace_
 */
export function catchAllTrace<E, R2, E2, A2>(
  h: (tuple: Tuple<[E, Trace]>) => Effect<R2, E2, A2>,
  __trace?: string
) {
  return <R, A>(self: Effect<R, E, A>): Effect<R & R2, E2, A | A2> =>
    catchAllTrace_(self, h, __trace)
}
