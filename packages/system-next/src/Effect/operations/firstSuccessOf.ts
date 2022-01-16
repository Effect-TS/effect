// ets_tracing: off

import * as A from "../../Collections/Immutable/Array"
import * as NA from "../../Collections/Immutable/NonEmptyArray"
import type { Effect } from "../definition"
import { orElse_ } from "./orElse"
import { suspendSucceed } from "./suspendSucceed"

/**
 * Returns an effect that runs this effect and in case of failure, runs each
 * of the specified effects in order until one of them succeeds.
 */
export function firstSuccessOf<R, E, A>(
  effects: NA.NonEmptyArray<Effect<R, E, A>>,
  __trace?: string
): Effect<R, E, A> {
  return suspendSucceed(() => {
    const head = NA.head(effects)
    const rest = NA.tail(effects)
    return A.reduce_(rest, head, (b, a) => orElse_(b, () => a))
  }, __trace)
}
