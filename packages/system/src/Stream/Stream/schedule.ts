// ets_tracing: off

import type * as CL from "../../Clock"
import * as E from "../../Either"
import type * as H from "../../Has"
import * as O from "../../Option"
import type * as SC from "../../Schedule"
import { collect_ } from "./collect"
import type { Stream } from "./definitions"
import { scheduleEither_ } from "./scheduleEither"

/**
 * Schedules the output of the stream using the provided `schedule`.
 */
export function schedule_<R, R1, E, O extends O1, O1, X>(
  self: Stream<R, E, O>,
  schedule: SC.Schedule<R1, O1, X>
): Stream<R & R1 & H.Has<CL.Clock>, E, O> {
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
export function schedule<R1, O extends O1, O1, X>(schedule: SC.Schedule<R1, O1, X>) {
  return <R, E>(self: Stream<R, E, O>) => schedule_(self, schedule)
}
