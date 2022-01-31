// ets_tracing: off

import type * as CL from "../../../../Clock/index.js"
import * as E from "../../../../Either/index.js"
import type * as SC from "../../../../Schedule/index.js"
import type * as C from "../core.js"
import * as RepeatWith from "./repeatWith.js"

/**
 * Repeats the entire stream using the specified schedule. The stream will execute normally,
 * and then repeat again according to the provided schedule. The schedule output will be emitted at
 * the end of each repetition.
 */
export function repeatEither_<R, R1, E, A, B>(
  self: C.Stream<R, E, A>,
  schedule: SC.Schedule<R1, any, B>
): C.Stream<R & R1 & CL.HasClock, E, E.Either<B, A>> {
  return RepeatWith.repeatWith_(self, schedule, E.right, E.left)
}

/**
 * Repeats the entire stream using the specified schedule. The stream will execute normally,
 * and then repeat again according to the provided schedule. The schedule output will be emitted at
 * the end of each repetition.
 *
 * @ets_data_first repeatEither_
 */
export function repeatEither<R1, B>(schedule: SC.Schedule<R1, any, B>) {
  return <R, E, A>(self: C.Stream<R, E, A>) => repeatEither_(self, schedule)
}
