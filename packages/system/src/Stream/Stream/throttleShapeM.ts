// ets_tracing: off

import * as CL from "../../Clock/index.js"
import type * as A from "../../Collections/Immutable/Chunk/index.js"
import * as Tp from "../../Collections/Immutable/Tuple/index.js"
import { pipe } from "../../Function/index.js"
import * as O from "../../Option/index.js"
import * as T from "../_internal/effect.js"
import * as M from "../_internal/managed.js"
import * as Ref from "../_internal/ref.js"
import { Stream } from "./definitions.js"

/**
 * Delays the chunks of this stream according to the given bandwidth parameters using the token bucket
 * algorithm. Allows for burst in the processing of elements by allowing the token bucket to accumulate
 * tokens up to a `units + burst` threshold. The weight of each chunk is determined by the `costFn`
 * effectful function.
 */
export function throttleShapeM_<O, R1, E1, R, E>(
  self: Stream<R, E, O>,
  costFn: (c: A.Chunk<O>) => T.Effect<R1, E1, number>,
  units: number,
  duration: number,
  burst = 0
): Stream<CL.HasClock & R1 & R, E | E1, O> {
  return new Stream(
    pipe(
      M.do,
      M.bind("chunks", () => self.proc),
      M.bind("currentTime", () => T.toManaged(CL.currentTime)),
      M.bind("bucket", ({ currentTime }) =>
        T.toManaged(Ref.makeRef(Tp.tuple(units, currentTime)))
      ),
      M.let(
        "pull",
        ({
          bucket,
          chunks
        }): T.Effect<CL.HasClock & R1 & R, O.Option<E | E1>, A.Chunk<O>> =>
          pipe(
            T.do,
            T.bind("chunk", () => chunks),
            T.bind("weight", ({ chunk }) => T.mapError_(costFn(chunk), O.some)),
            T.bind("current", () => CL.currentTime),
            T.bind("delay", ({ current, weight }) =>
              Ref.modify_(bucket, ({ tuple: [tokens, timestamp] }) => {
                const elapsed = current - timestamp
                const cycles = elapsed / duration
                const available = (() => {
                  const sum = tokens + cycles * units
                  const max = units + burst < 0 ? Number.MAX_VALUE : units + burst

                  return sum < 0 ? max : Math.min(sum, max)
                })()

                const remaining = available - weight
                const waitCycles = remaining >= 0 ? 0 : -remaining / units
                const delay = waitCycles * duration

                return Tp.tuple(delay, Tp.tuple(remaining, current))
              })
            ),
            T.tap(({ delay }) => T.when_(CL.sleep(delay), () => delay > 0)),
            T.map(({ chunk }) => chunk)
          )
      ),
      M.map(({ pull }) => pull)
    )
  )
}

/**
 * Delays the chunks of this stream according to the given bandwidth parameters using the token bucket
 * algorithm. Allows for burst in the processing of elements by allowing the token bucket to accumulate
 * tokens up to a `units + burst` threshold. The weight of each chunk is determined by the `costFn`
 * effectful function.
 *
 * @ets_data_first throttleShapeM_
 */
export function throttleShapeM<O, R1, E1>(
  costFn: (c: A.Chunk<O>) => T.Effect<R1, E1, number>,
  units: number,
  duration: number,
  burst = 0
) {
  return <R, E>(self: Stream<R, E, O>): Stream<CL.HasClock & R1 & R, E | E1, O> =>
    throttleShapeM_(self, costFn, units, duration, burst)
}
