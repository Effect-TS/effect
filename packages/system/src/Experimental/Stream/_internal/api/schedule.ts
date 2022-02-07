// ets_tracing: off

import type * as CL from "../../../../Clock/index.js"
import * as E from "../../../../Either/index.js"
import * as O from "../../../../Option/index.js"
import type * as SC from "../../../../Schedule/index.js"
import type * as C from "../core.js"
import * as Collect from "./collect.js"
import * as ScheduleEither from "./scheduleEither.js"

/**
 * Schedules the output of the stream using the provided `schedule`.
 */
export function schedule_<R, R1, E, A extends B, B, Z>(
  self: C.Stream<R, E, A>,
  schedule: SC.Schedule<R1, B, Z>
): C.Stream<R & CL.HasClock & R1, E, A> {
  return Collect.collect_(
    ScheduleEither.scheduleEither_(self, schedule),
    E.fold(
      (_) => O.none,
      (r) => O.some(r)
    )
  )
}

/**
 * Schedules the output of the stream using the provided `schedule`.
 *
 * @ets_data_first schedule_
 */
export function schedule<R1, B, Z>(schedule: SC.Schedule<R1, B, Z>) {
  return <R, E, A extends B>(self: C.Stream<R, E, A>) => schedule_(self, schedule)
}
