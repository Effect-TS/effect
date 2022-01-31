// ets_tracing: off

import type * as CL from "../../../../Clock/index.js"
import * as CK from "../../../../Collections/Immutable/Chunk/index.js"
import * as T from "../../../../Effect/index.js"
import { pipe } from "../../../../Function/index.js"
import * as SC from "../../../../Schedule/index.js"
import * as CH from "../../Channel/index.js"
import * as C from "../core.js"
import * as Map from "./map.js"
import * as Unwrap from "./unwrap.js"

/**
 * Repeats the entire stream using the specified schedule. The stream will execute normally,
 * and then repeat again according to the provided schedule. The schedule output will be emitted at
 * the end of each repetition and can be unified with the stream elements using the provided functions.
 */
export function repeatWith_<R, R1, E, A, B, C1, C2>(
  self: C.Stream<R, E, A>,
  schedule: SC.Schedule<R1, any, B>,
  f: (a: A) => C1,
  g: (b: B) => C2
): C.Stream<R & R1 & CL.HasClock, E, C1 | C2> {
  return Unwrap.unwrap(
    pipe(
      T.do,
      T.bind("driver", () => SC.driver(schedule)),
      T.map(({ driver }) => {
        const scheduleOutput = T.map_(T.orDie(driver.last), g)
        const process = Map.map_(self, f).channel
        const loop: CH.Channel<
          R & R1 & CL.HasClock,
          unknown,
          unknown,
          unknown,
          E,
          CK.Chunk<C1 | C2>,
          void
        > = CH.unwrap(
          T.fold_(
            driver.next(undefined),
            (_) => CH.unit,
            (_) =>
              CH.zipRight_(
                CH.zipRight_(
                  process,
                  CH.unwrap(T.map_(scheduleOutput, (o) => CH.write(CK.single(o))))
                ),
                loop
              )
          )
        )

        return new C.Stream(CH.zipRight_(process, loop))
      })
    )
  )
}

/**
 * Repeats the entire stream using the specified schedule. The stream will execute normally,
 * and then repeat again according to the provided schedule. The schedule output will be emitted at
 * the end of each repetition and can be unified with the stream elements using the provided functions.
 *
 * @ets_data_first repeatWith_
 */
export function repeatWith<R1, A, B, C1, C2>(
  schedule: SC.Schedule<R1, any, B>,
  f: (a: A) => C1,
  g: (b: B) => C2
) {
  return <R, E>(self: C.Stream<R, E, A>) => repeatWith_(self, schedule, f, g)
}
