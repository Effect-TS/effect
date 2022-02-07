// ets_tracing: off

import type * as CL from "../../Clock/index.js"
import type * as SC from "../../Schedule/index.js"
import * as T from "../_internal/effect.js"
import type { Stream } from "./definitions.js"
import { repeatEffectWith } from "./repeatEffectWith.js"

/**
 * Repeats the value using the provided schedule.
 */
export function repeatValueWith<R, A extends A1, A1, X>(
  a: () => A,
  schedule: SC.Schedule<R, A1, X>
): Stream<R & CL.HasClock, never, A> {
  return repeatEffectWith(T.succeedWith(a), schedule)
}
