// ets_tracing: off

import type * as CL from "../../../../Clock"
import * as T from "../../../../Effect"
import { pipe } from "../../../../Function"
import * as SC from "../../../../Schedule"
import type * as C from "../core"
import * as CatchAll from "./catchAll"
import * as Tap from "./tap"
import * as Unwrap from "./unwrap"

/**
 * When the stream fails, retry it according to the given schedule
 *
 * This retries the entire stream, so will re-execute all of the stream's acquire operations.
 *
 * The schedule is reset as soon as the first element passes through the stream again.
 */
export function retry_<R, R1, E, A, Z>(
  self: C.Stream<R, E, A>,
  schedule: SC.Schedule<R1, E, Z>
): C.Stream<R & R1 & CL.HasClock, E, A> {
  return Unwrap.unwrap(
    pipe(
      T.do,
      T.bind("driver", () => SC.driver(schedule)),
      T.map(({ driver }) => {
        const loop: C.Stream<R & R1 & CL.HasClock, E, A> = pipe(
          self,
          CatchAll.catchAll((e) =>
            Unwrap.unwrap(
              pipe(
                driver.next(e),
                T.foldM(
                  (_) => T.fail(e),
                  (_) => T.succeed(Tap.tap_(loop, (_) => driver.reset))
                )
              )
            )
          )
        )

        return loop
      })
    )
  )
}

/**
 * When the stream fails, retry it according to the given schedule
 *
 * This retries the entire stream, so will re-execute all of the stream's acquire operations.
 *
 * The schedule is reset as soon as the first element passes through the stream again.
 */
export function retry<R1, E, Z>(schedule: SC.Schedule<R1, E, Z>) {
  return <R, A>(self: C.Stream<R, E, A>) => retry_(self, schedule)
}
