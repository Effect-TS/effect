import type { Clock } from "../../Clock"
import * as E from "../../Either"
import type { Has } from "../../Has"
import * as O from "../../Option"
import type { Schedule } from "../../Schedule"
import { collect_ } from "./collect"
import type { Stream } from "./definitions"
import { scheduleEither_ } from "./scheduleEither"

/**
 * Schedules the output of the stream using the provided `schedule`.
 */
export function schedule_<R, R1, E, O>(
  self: Stream<R, E, O>,
  schedule: Schedule<R1, O, any>
): Stream<R & R1 & Has<Clock>, E, O> {
  return collect_(
    scheduleEither_(self, schedule),
    E.fold(
      (_) => O.none,
      (a) => O.some(a)
    )
  )
}

/**
 * Schedules the output of the stream using the provided `schedule`.
 */
export function schedule<R1, O>(schedule: Schedule<R1, O, any>) {
  return <R, E>(self: Stream<R, E, O>) => schedule_(self, schedule)
}
