import type * as CL from "../../Clock"
import { constVoid, flow } from "../../Function"
import * as SC from "../../Schedule"
import * as T from "../_internal/effect"
import type { Stream } from "./definitions"
import { repeatEffectOption } from "./repeatEffectOption"
import { unwrap } from "./unwrap"

/**
 * Creates a stream from a `Schedule` that does not require any further
 * input. The stream will emit an element for each value output from the
 * schedule, continuing for as long as the schedule continues.
 */
export const fromSchedule: <R, A>(
  schedule: SC.Schedule<R, unknown, A>
) => Stream<R & CL.HasClock, never, A> = flow(
  SC.driver,
  T.map((driver) => repeatEffectOption(driver.next(constVoid()))),
  unwrap
)
