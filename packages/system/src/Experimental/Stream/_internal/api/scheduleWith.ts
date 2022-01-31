// ets_tracing: off

import type * as CL from "../../../../Clock/index.js"
import * as CK from "../../../../Collections/Immutable/Chunk/index.js"
import * as T from "../../../../Effect/index.js"
import * as SC from "../../../../Schedule/index.js"
import * as CH from "../../Channel/index.js"
import * as C from "../core.js"

/**
 * Schedules the output of the stream using the provided `schedule` and emits its output at
 * the end (if `schedule` is finite).
 * Uses the provided function to align the stream and schedule outputs on the same type.
 */
export function scheduleWith_<R, R1, E, E1, A, B, C1, C2>(
  self: C.Stream<R, E, A>,
  schedule: SC.Schedule<R1, A, B>,
  f: (a: A) => C1,
  g: (b: B) => C2
): C.Stream<R & R1 & CL.HasClock, E | E1, C1 | C2> {
  const loop = (
    driver: SC.Driver<CL.HasClock & R1, A, B>,
    chunk: CK.Chunk<A>,
    index: number
  ): CH.Channel<
    R1 & CL.HasClock,
    E | E1,
    CK.Chunk<A>,
    unknown,
    E | E1,
    CK.Chunk<C1 | C2>,
    any
  > => {
    if (index < CK.size(chunk)) {
      return CH.unwrap(
        T.suspend(() => {
          const a = CK.unsafeGet_(chunk, index)

          return T.foldM_(
            driver.next(a),
            () =>
              T.zipLeft_(
                T.map_(T.orDie(driver.last), (b) =>
                  CH.zipRight_(
                    CH.write(CK.make(f(a), g(b))),
                    loop(driver, chunk, index + 1)
                  )
                ),
                driver.reset
              ),
            () =>
              T.succeed(
                CH.zipRight_(CH.write(CK.single(f(a))), loop(driver, chunk, index + 1))
              )
          )
        })
      )
    } else {
      return CH.readWithCause(
        (chunk) => loop(driver, chunk, 0),
        (_) => CH.failCause(_),
        (_) => CH.end(_)
      )
    }
  }

  return new C.Stream(
    CH.chain_(CH.fromEffect(SC.driver(schedule)), (_) =>
      self.channel[">>>"](loop(_, CK.empty<A>(), 0))
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
