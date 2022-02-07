// ets_tracing: off

import type * as CL from "../../Clock/index.js"
import * as A from "../../Collections/Immutable/Chunk/index.js"
import { pipe } from "../../Function/index.js"
import type * as H from "../../Has/index.js"
import * as SC from "../../Schedule/index.js"
import * as BP from "../../Stream/BufferedPull/index.js"
import * as T from "../_internal/effect.js"
import * as M from "../_internal/managed.js"
import { Stream } from "./definitions.js"

/**
 * Schedules the output of the stream using the provided `schedule` and emits its output at
 * the end (if `schedule` is finite).
 * Uses the provided function to align the stream and schedule outputs on the same type.
 */
export function scheduleWith<R1, O, B>(schedule: SC.Schedule<R1, O, B>) {
  return <C, D>(f: (o: O) => C, g: (b: B) => D) =>
    <R, E>(self: Stream<R, E, O>): Stream<R & R1 & H.Has<CL.Clock>, E, C | D> => {
      return new Stream(
        pipe(
          M.do,
          M.bind("as", () => M.mapM_(self.proc, BP.make)),
          M.bind("driver", () => T.toManaged(SC.driver(schedule))),
          M.let("pull", ({ as, driver }) =>
            T.chain_(BP.pullElement(as), (o) =>
              T.orElse_(T.as_(driver.next(o), A.single(f(o))), () =>
                T.zipLeft_(
                  T.map_(T.orDie(driver.last), (b) => A.append_(A.single(f(o)), g(b))),
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
