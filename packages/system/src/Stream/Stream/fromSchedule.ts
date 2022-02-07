// ets_tracing: off

import type * as CL from "../../Clock/index.js"
import { constVoid, pipe } from "../../Function/index.js"
import * as SC from "../../Schedule/index.js"
import * as T from "../_internal/effect.js"
import type { Stream } from "./definitions.js"
import { repeatEffectOption } from "./repeatEffectOption.js"
import { unwrap } from "./unwrap.js"

/**
 * Creates a stream from a `Schedule` that does not require any further
 * input. The stream will emit an element for each value output from the
 * schedule, continuing for as long as the schedule continues.
 */
export const fromSchedule: <R, A>(
  schedule: SC.Schedule<R, unknown, A>
) => Stream<R & CL.HasClock, never, A> = (x) =>
  pipe(
    x,
    SC.driver,
    T.map((driver) => repeatEffectOption(driver.next(constVoid()))),
    unwrap
  )
