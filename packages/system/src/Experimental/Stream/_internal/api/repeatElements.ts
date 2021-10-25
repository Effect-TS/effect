// ets_tracing: off

import type * as CL from "../../../../Clock"
import * as E from "../../../../Either"
import * as O from "../../../../Option"
import type * as SC from "../../../../Schedule"
import type * as C from "../core"
import * as Collect from "./collect"
import * as RepeatElementsEither from "./repeatElementsEither"

/**
 * Repeats each element of the stream using the provided schedule. Repetitions are done in
 * addition to the first execution, which means using `Schedule.recurs(1)` actually results in
 * the original effect, plus an additional recurrence, for a total of two repetitions of each
 * value in the stream.
 */
export function repeatElements_<R, R1, E, A, B>(
  self: C.Stream<R, E, A>,
  schedule: SC.Schedule<R1, any, B>
): C.Stream<R & R1 & CL.HasClock, E, A> {
  return Collect.collect_(
    RepeatElementsEither.repeatElementsEither_(self, schedule),
    E.fold(
      () => O.none,
      (a) => O.some(a)
    )
  )
}

/**
 * Repeats each element of the stream using the provided schedule. Repetitions are done in
 * addition to the first execution, which means using `Schedule.recurs(1)` actually results in
 * the original effect, plus an additional recurrence, for a total of two repetitions of each
 * value in the stream.
 *
 * @ets_data_first repeatElements_
 */
export function repeatElements<R1, B>(schedule: SC.Schedule<R1, any, B>) {
  return <R, E, A>(self: C.Stream<R, E, A>) => repeatElements_(self, schedule)
}
