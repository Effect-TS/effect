// ets_tracing: off

import * as CL from "../../../../Clock/index.js"
import type * as CK from "../../../../Collections/Immutable/Chunk/index.js"
import * as T from "../../../../Effect/index.js"
import { pipe } from "../../../../Function/index.js"
import * as CH from "../../Channel/index.js"
import * as C from "../core.js"

/**
 * Delays the chunks of this stream according to the given bandwidth parameters using the token bucket
 * algorithm. Allows for burst in the processing of elements by allowing the token bucket to accumulate
 * tokens up to a `units + burst` threshold. The weight of each chunk is determined by the `costFn`
 * effectful function.
 */
export function throttleShapeEffect_<R, R1, E, E1, A>(
  self: C.Stream<R, E, A>,
  units: number,
  duration: number,
  costFn: (a: CK.Chunk<A>) => T.Effect<R1, E1, number>,
  burst = 0
): C.Stream<CL.HasClock & R & R1, E | E1, A> {
  const loop = (
    tokens: number,
    timestamp: number
  ): CH.Channel<
    R1 & CL.HasClock,
    E | E1,
    CK.Chunk<A>,
    unknown,
    E | E1,
    CK.Chunk<A>,
    void
  > =>
    CH.readWith(
      (in_) =>
        CH.unwrap(
          pipe(
            T.do,
            T.bind("weight", () => costFn(in_)),
            T.bind("current", () => CL.currentTime),
            T.map(({ current, weight }) => {
              const elapsed = current - timestamp
              const cycles = elapsed - duration
              const available = (() => {
                const sum = Math.floor(tokens + cycles * units)
                const max = units + burst < 0 ? Number.MAX_SAFE_INTEGER : units + burst

                return sum < 0 ? max : Math.min(sum, max)
              })()

              const remaining = available - weight
              const waitCycles = remaining >= 0 ? 0 : -remaining / units
              const delay = Math.floor(waitCycles * duration)

              if (delay > 0) {
                return CH.zipRight_(
                  CH.zipRight_(CH.fromEffect(CL.sleep(delay)), CH.write(in_)),
                  loop(remaining, current)
                )
              } else {
                return CH.zipRight_(CH.write(in_), loop(remaining, current))
              }
            })
          )
        ),
      (e) => CH.fail(e),
      (_) => CH.unit
    )

  return new C.Stream(
    CH.chain_(CH.fromEffect(CL.currentTime), (_) => self.channel[">>>"](loop(units, _)))
  )
}

/**
 * Delays the chunks of this stream according to the given bandwidth parameters using the token bucket
 * algorithm. Allows for burst in the processing of elements by allowing the token bucket to accumulate
 * tokens up to a `units + burst` threshold. The weight of each chunk is determined by the `costFn`
 * effectful function.
 *
 * @ets_data_first throttleShapeEffect_
 */
export function throttleShapeEffect<R1, E1, A>(
  units: number,
  duration: number,
  costFn: (a: CK.Chunk<A>) => T.Effect<R1, E1, number>,
  burst = 0
) {
  return <R, E>(self: C.Stream<R, E, A>) =>
    throttleShapeEffect_(self, units, duration, costFn, burst)
}
