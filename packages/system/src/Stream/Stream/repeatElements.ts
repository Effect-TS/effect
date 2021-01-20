import type * as CL from "../../Clock"
import * as O from "../../Option"
import type * as SC from "../../Schedule"
import { collect_ } from "./collect"
import type { Stream } from "./definitions"
import { repeatElementsEither_ } from "./repeatElementsEither"

/**
 * Repeats each element of the stream using the provided schedule. Repetitions are done in
 * addition to the first execution, which means using `Schedule.recurs(1)` actually results in
 * the original effect, plus an additional recurrence, for a total of two repetitions of each
 * value in the stream.
 */
export function repeatElements_<R, R1, E, O>(
  self: Stream<R, E, O>,
  schedule: SC.Schedule<R1, O, any>
): Stream<R & R1 & CL.HasClock, E, O> {
  return collect_(repeatElementsEither_(self, schedule), O.fromEither)
}

/**
 * Repeats each element of the stream using the provided schedule. Repetitions are done in
 * addition to the first execution, which means using `Schedule.recurs(1)` actually results in
 * the original effect, plus an additional recurrence, for a total of two repetitions of each
 * value in the stream.
 */
export function repeatElements<R1, O>(schedule: SC.Schedule<R1, O, any>) {
  return <R, E>(self: Stream<R, E, O>) => repeatElements_(self, schedule)
}
