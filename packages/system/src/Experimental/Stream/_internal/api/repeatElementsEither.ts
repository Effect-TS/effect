// ets_tracing: off

import type * as CL from "../../../../Clock"
import * as E from "../../../../Either"
import type * as SC from "../../../../Schedule"
import type * as C from "../core"
import * as RepeatElementsWith from "./repeatElementsWith"

/**
 * Repeats each element of the stream using the provided schedule. When the schedule is finished,
 * then the output of the schedule will be emitted into the stream. Repetitions are done in
 * addition to the first execution, which means using `Schedule.recurs(1)` actually results in
 * the original effect, plus an additional recurrence, for a total of two repetitions of each
 * value in the stream.
 */
export function repeatElementsEither_<R, R1, E, A, B>(
  self: C.Stream<R, E, A>,
  schedule: SC.Schedule<R1, any, B>
): C.Stream<R & R1 & CL.HasClock, E, E.Either<B, A>> {
  return RepeatElementsWith.repeatElementsWith_(self, schedule, E.right, E.left)
}

/**
 * Repeats each element of the stream using the provided schedule. When the schedule is finished,
 * then the output of the schedule will be emitted into the stream. Repetitions are done in
 * addition to the first execution, which means using `Schedule.recurs(1)` actually results in
 * the original effect, plus an additional recurrence, for a total of two repetitions of each
 * value in the stream.
 *
 * @ets_data_first repeatElementsEither_
 */
export function repeatElementsEither<R1, B>(schedule: SC.Schedule<R1, any, B>) {
  return <R, E, A>(self: C.Stream<R, E, A>) => repeatElementsEither_(self, schedule)
}
