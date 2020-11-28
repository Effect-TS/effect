import * as A from "../../Array"
import type * as CL from "../../Clock"
import { pipe } from "../../Function"
import type * as H from "../../Has"
import * as SC from "../../Schedule"
import * as BP from "../../Stream/BufferedPull"
import * as T from "../_internal/effect"
import * as M from "../_internal/managed"
import { Stream } from "./definitions"

/**
 * Schedules the output of the stream using the provided `schedule` and emits its output at
 * the end (if `schedule` is finite).
 * Uses the provided function to align the stream and schedule outputs on the same type.
 */
export function scheduleWith<R1, O, B>(schedule: SC.Schedule<R1, O, B>) {
  return <C, D>(f: (o: O) => C, g: (b: B) => D) => <R, E>(
    self: Stream<R, E, O>
  ): Stream<R & R1 & H.Has<CL.Clock>, E, C | D> => {
    return new Stream(
      pipe(
        M.do,
        M.bind("as", () => M.mapM_(self.proc, BP.make)),
        M.bind("driver", () => T.toManaged_(SC.driver(schedule))),
        M.let("pull", ({ as, driver }) =>
          T.chain_(BP.pullElement(as), (o) =>
            T.orElse_(T.as_(driver.next(o), A.single(f(o))), () =>
              T.zipLeft_(
                T.map_(T.orDie(driver.last), (b) => [f(o), g(b)]),
                driver.reset
              )
            )
          )
        ),
        M.map(({ pull }) => pull)
      )
    )
  }
}
