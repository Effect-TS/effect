// ets_tracing: off

import type * as CL from "../../../../Clock"
import * as E from "../../../../Either"
import * as O from "../../../../Option"
import type * as SC from "../../../../Schedule"
import type * as C from "../core"
import * as Collect from "./collect"
import * as RepeatEither from "./repeatEither"

/**
 * Repeats the entire stream using the specified schedule. The stream will execute normally,
 * and then repeat again according to the provided schedule.
 */
export function repeatSchedule_<R, R1, E, A, B>(
  self: C.Stream<R, E, A>,
  schedule: SC.Schedule<R1, any, B>
): C.Stream<R & R1 & CL.HasClock, E, A> {
  return Collect.collect_(
    RepeatEither.repeatEither_(self, schedule),
    E.fold(
      (_) => O.none,
      (a) => O.some(a)
    )
  )
}

/**
 * Repeats the entire stream using the specified schedule. The stream will execute normally,
 * and then repeat again according to the provided schedule.
 *
 * @ets_data_first repeat_
 */
export function repeatSchedule<R1, B>(schedule: SC.Schedule<R1, any, B>) {
  return <R, E, A>(self: C.Stream<R, E, A>) => repeatSchedule_(self, schedule)
}
