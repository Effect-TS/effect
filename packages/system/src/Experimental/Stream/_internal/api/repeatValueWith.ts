// ets_tracing: off

import type * as CL from "../../../../Clock/index.js"
import * as T from "../../../../Effect/index.js"
import type * as SC from "../../../../Schedule/index.js"
import type * as C from "../core.js"
import * as RepeatEffectWith from "./repeatEffectWith.js"

/**
 * Repeats the value using the provided schedule.
 */
export function repeatValueWith<R, A, Z>(
  a: A,
  schedule: SC.Schedule<R, A, Z>
): C.Stream<R & CL.HasClock, never, A> {
  return RepeatEffectWith.repeatEffectWith(T.succeed(a), schedule)
}
