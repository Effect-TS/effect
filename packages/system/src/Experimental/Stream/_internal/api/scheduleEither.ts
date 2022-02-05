// ets_tracing: off

import type * as CL from "../../../../Clock/index.js"
import * as E from "../../../../Either/index.js"
import type * as SC from "../../../../Schedule/index.js"
import type * as C from "../core.js"
import * as ScheduleWith from "./scheduleWith.js"

/**
 * Schedules the output of the stream using the provided `schedule` and emits its output at
 * the end (if `schedule` is finite).
 */
export function scheduleEither_<R, R1, E, A, B>(
  self: C.Stream<R, E, A>,
  schedule: SC.Schedule<R1, A, B>
): C.Stream<R & CL.HasClock & R1, E, E.Either<B, A>> {
  return ScheduleWith.scheduleWith_(
    self,
    schedule,
    (r) => E.right(r),
    (l) => E.left(l)
  )
}

/**
 * Schedules the output of the stream using the provided `schedule` and emits its output at
 * the end (if `schedule` is finite).
 *
 * @ets_data_first scheduleEither_
 */
export function scheduleEither<R1, A, B>(schedule: SC.Schedule<R1, A, B>) {
  return <R, E>(self: C.Stream<R, E, A>) => scheduleEither_(self, schedule)
}
