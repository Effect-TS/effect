// ets_tracing: off

import type * as CL from "../../../../Clock"
import * as E from "../../../../Either"
import * as O from "../../../../Option"
import type * as SC from "../../../../Schedule"
import type * as C from "../core"
import * as Collect from "./collect"
import * as ScheduleEither from "./scheduleEither"

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
