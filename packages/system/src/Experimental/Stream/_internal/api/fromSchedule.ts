// ets_tracing: off

import type * as CL from "../../../../Clock"
import * as T from "../../../../Effect"
import * as SC from "../../../../Schedule"
import type * as C from "../core.js"
import * as RepeatEffectOption from "./repeatEffectOption.js"
import * as Unwrap from "./unwrap.js"

/**
 * Creates a stream from a `Schedule` that does not require any further
 * input. The stream will emit an element for each value output from the
 * schedule, continuing for as long as the schedule continues.
 */
export function fromSchedule<R, A>(
  schedule: SC.Schedule<R, unknown, A>
): C.Stream<CL.HasClock & R, never, A> {
  return Unwrap.unwrap(
    T.map_(SC.driver(schedule), (driver) =>
      RepeatEffectOption.repeatEffectOption(driver.next(undefined))
    )
  )
}
