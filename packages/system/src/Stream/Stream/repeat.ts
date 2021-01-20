import type * as CL from "../../Clock"
import * as O from "../../Option"
import type * as SC from "../../Schedule"
import { collect_ } from "./collect"
import type { Stream } from "./definitions"
import { repeatEither_ } from "./repeatEither"

/**
 * Repeats the entire stream using the specified schedule. The stream will execute normally,
 * and then repeat again according to the provided schedule.
 */
export function repeat_<R, R1, E, O, B>(
  self: Stream<R, E, O>,
  schedule: SC.Schedule<R1, unknown, B>
): Stream<R & R1 & CL.HasClock, E, O> {
  return collect_(repeatEither_(self, schedule), O.fromEither)
}

/**
 * Repeats the entire stream using the specified schedule. The stream will execute normally,
 * and then repeat again according to the provided schedule.
 */
export function repeat<R1, B>(schedule: SC.Schedule<R1, unknown, B>) {
  return <R, E, O>(self: Stream<R, E, O>) => repeat_(self, schedule)
}
