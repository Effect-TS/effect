// ets_tracing: off

import type * as CL from "../../Clock/index.js"
import * as O from "../../Option/index.js"
import type * as SC from "../../Schedule/index.js"
import { collect_ } from "./collect.js"
import type { Stream } from "./definitions.js"
import { repeatEither_ } from "./repeatEither.js"

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
