// ets_tracing: off

import type * as CL from "../../Clock/index.js"
import * as A from "../../Collections/Immutable/Chunk/index.js"
import { pipe } from "../../Function/index.js"
import * as O from "../../Option/index.js"
import * as SC from "../../Schedule/index.js"
import * as T from "../_internal/effect.js"
import * as M from "../_internal/managed.js"
import * as Ref from "../_internal/ref.js"
import * as BP from "../BufferedPull/index.js"
import { Stream } from "./definitions.js"

/**
 * Repeats each element of the stream using the provided schedule. When the schedule is finished,
 * then the output of the schedule will be emitted into the stream. Repetitions are done in
 * addition to the first execution, which means using `Schedule.recurs(1)` actually results in
 * the original effect, plus an additional recurrence, for a total of two repetitions of each
 * value in the stream.
 *
 * This function accepts two conversion functions, which allow the output of this stream and the
 * output of the provided schedule to be unified into a single type. For example, `Either` or
 * similar data type.
 */
export function repeatElementsWith<R1, O, B>(schedule: SC.Schedule<R1, O, B>) {
  return <C, D>(f: (o: O) => C, g: (b: B) => D) =>
    <R, E>(self: Stream<R, E, O>): Stream<R & R1 & CL.HasClock, E, C | D> =>
      new Stream(
        pipe(
          M.do,
          M.bind("as", () => M.mapM_(self.proc, (_) => BP.make(_))),
          M.bind("driver", () => T.toManaged(SC.driver(schedule))),
          M.bind("state", () => T.toManaged(Ref.makeRef<O.Option<O>>(O.none))),
          M.let("pull", ({ as, driver, state }) => {
            const go: T.Effect<
              R & R1 & CL.HasClock,
              O.Option<E>,
              A.Chunk<C | D>
            > = T.chain_(
              state.get,
              O.fold(
                () =>
                  T.chain_(BP.pullElement(as), (o) =>
                    T.as_(state.set(O.some(o)), A.single(f(o)))
                  ),
                (o): T.Effect<R & R1 & CL.HasClock, O.Option<E>, A.Chunk<C | D>> => {
                  const advance = T.as_(driver.next(o), A.single(f(o)))
                  const reset = pipe(
                    driver.last,
                    T.orDie,
                    T.map((b) => A.single(g(b))),
                    T.zipLeft(driver.reset),
                    T.zipLeft(state.set(O.none))
                  )

                  return T.orElse_(advance, () => reset)
                }
              )
            )

            return go
          }),
          M.map(({ pull }) => pull)
        )
      )
}
