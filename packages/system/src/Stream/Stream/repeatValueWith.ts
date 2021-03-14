// tracing: off

import type * as CL from "../../Clock"
import type * as SC from "../../Schedule"
import * as T from "../_internal/effect"
import type { Stream } from "./definitions"
import { repeatEffectWith } from "./repeatEffectWith"

/**
 * Repeats the value using the provided schedule.
 */
export function repeatValueWith<R, A extends A1, A1, X>(
  a: () => A,
  schedule: SC.Schedule<R, A1, X>
): Stream<R & CL.HasClock, never, A> {
  return repeatEffectWith(T.effectTotal(a), schedule)
}
