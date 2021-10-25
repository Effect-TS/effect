// ets_tracing: off

import type * as CL from "../../../../Clock"
import * as T from "../../../../Effect"
import { pipe } from "../../../../Function"
import * as SC from "../../../../Schedule"
import type * as C from "../core"
import * as LoopOnPartialChunksElements from "./loopOnPartialChunksElements"
import * as Unwrap from "./unwrap"

/**
 * Schedules the output of the stream using the provided `schedule` and emits its output at
 * the end (if `schedule` is finite).
 * Uses the provided function to align the stream and schedule outputs on the same type.
 */
export function scheduleWith_<R, R1, E, A, B, C1, C2>(
  self: C.Stream<R, E, A>,
  schedule: SC.Schedule<R1, A, B>,
  f: (a: A) => C1,
  g: (b: B) => C2
): C.Stream<R & CL.HasClock & R1, E, C1 | C2> {
  return Unwrap.unwrap(
    T.map_(SC.driver(schedule), (driver) =>
      LoopOnPartialChunksElements.loopOnPartialChunksElements_(self, (a, emit) =>
        T.orElse_(T.zipRight_(driver.next(a), emit(f(a))), () =>
          pipe(
            driver.last,
            T.orDie,
            T.chain((b) => T.zipRight_(emit(f(a)), emit(g(b)))),
            T.zipLeft(driver.reset)
          )
        )
      )
    )
  )
}

/**
 * Schedules the output of the stream using the provided `schedule` and emits its output at
 * the end (if `schedule` is finite).
 * Uses the provided function to align the stream and schedule outputs on the same type.
 *
 * @ets_data_first scheduleWith_
 */
export function scheduleWith<R1, A, B, C1, C2>(
  schedule: SC.Schedule<R1, A, B>,
  f: (a: A) => C1,
  g: (b: B) => C2
) {
  return <R, E>(self: C.Stream<R, E, A>) => scheduleWith_(self, schedule, f, g)
}
