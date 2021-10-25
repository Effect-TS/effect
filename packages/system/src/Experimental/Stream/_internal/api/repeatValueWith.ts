// ets_tracing: off

import type * as CL from "../../../../Clock"
import * as T from "../../../../Effect"
import type * as SC from "../../../../Schedule"
import type * as C from "../core"
import * as RepeatEffectWith from "./repeatEffectWith"

/**
 * Repeats the value using the provided schedule.
 */
export function repeatValueWith<R, A, Z>(
  a: A,
  schedule: SC.Schedule<R, A, Z>
): C.Stream<R & CL.HasClock, never, A> {
  return RepeatEffectWith.repeatEffectWith(T.succeed(a), schedule)
}
