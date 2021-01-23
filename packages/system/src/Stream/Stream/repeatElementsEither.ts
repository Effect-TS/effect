import type * as CL from "../../Clock"
import * as E from "../../Either"
import { pipe } from "../../Function"
import type * as SC from "../../Schedule"
import type { Stream } from "./definitions"
import { repeatElementsWith } from "./repeatElementsWith"

/**
 * Repeats each element of the stream using the provided schedule. When the schedule is finished,
 * then the output of the schedule will be emitted into the stream. Repetitions are done in
 * addition to the first execution, which means using `Schedule.recurs(1)` actually results in
 * the original effect, plus an additional recurrence, for a total of two repetitions of each
 * value in the stream.
 */
export function repeatElementsEither_<R, R1, E, O, B>(
  self: Stream<R, E, O>,
  schedule: SC.Schedule<R1, O, B>
): Stream<R & R1 & CL.HasClock, E, E.Either<B, O>> {
  return pipe(self, repeatElementsWith(schedule)(E.right, E.left))
}

/**
 * Repeats each element of the stream using the provided schedule. When the schedule is finished,
 * then the output of the schedule will be emitted into the stream. Repetitions are done in
 * addition to the first execution, which means using `Schedule.recurs(1)` actually results in
 * the original effect, plus an additional recurrence, for a total of two repetitions of each
 * value in the stream.
 */
export function repeatElementsEither<R1, O, B>(schedule: SC.Schedule<R1, O, B>) {
  return <R, E>(self: Stream<R, E, O>) => repeatElementsEither_(self, schedule)
}
