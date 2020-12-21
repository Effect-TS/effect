import type * as CL from "../../Clock"
import type * as SC from "../../Schedule"
import * as T from "../_internal/effect"
import type { Stream } from "./definitions"
import { repeatEffectWith } from "./repeatEffectWith"

/**
 * Repeats the value using the provided schedule.
 */
export function repeatValueWith<R, A>(
  a: () => A,
  schedule: SC.Schedule<R, A, any>
): Stream<R & CL.HasClock, never, A> {
  return repeatEffectWith(T.succeed(a()), schedule)
}
