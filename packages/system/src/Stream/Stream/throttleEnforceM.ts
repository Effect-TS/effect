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
 * Throttles the chunks of this stream according to the given bandwidth parameters using the token bucket
 * algorithm. Allows for burst in the processing of elements by allowing the token bucket to accumulate
 * tokens up to a `units + burst` threshold. Chunks that do not meet the bandwidth constraints are dropped.
 * The weight of each chunk is determined by the `costFn` effectful function.
 *
 * @ets_data_first throttleEnforceM_
 */
export function throttleEnforceM<O, R1, E1>(
  costFn: (c: A.Chunk<O>) => T.Effect<R1, E1, number>,
  units: number,
  duration: number,
  burst = 0
) {
  return <R, E>(self: Stream<R, E, O>): Stream<R & R1 & CL.HasClock, E | E1, O> =>
    throttleEnforceM_(self, costFn, units, duration, burst)
}

/**
 * Throttles the chunks of this stream according to the given bandwidth parameters using the token bucket
 * algorithm. Allows for burst in the processing of elements by allowing the token bucket to accumulate
 * tokens up to a `units + burst` threshold. Chunks that do not meet the bandwidth constraints are dropped.
 * The weight of each chunk is determined by the `costFn` effectful function.
 */
export function throttleEnforceM_<R, E, O, R1, E1>(
  self: Stream<R, E, O>,
  costFn: (c: A.Chunk<O>) => T.Effect<R1, E1, number>,
  units: number,
  duration: number,
  burst = 0
): Stream<R & R1 & CL.HasClock, E | E1, O> {
  return new Stream(
    pipe(
      M.do,
      M.bind("chunks", () => self.proc),
      M.bind("currentTime", () => T.toManaged(CL.currentTime)),
      M.bind("bucket", ({ currentTime }) =>
        T.toManaged(Ref.makeRef(Tp.tuple(units, currentTime)))
      ),
      M.let("pull", ({ bucket, chunks }) => {
        const go: T.Effect<
          R & R1 & CL.HasClock,
          O.Option<E | E1>,
          A.Chunk<O>
        > = T.chain_(chunks, (chunk) =>
          pipe(
            pipe(costFn(chunk), T.mapError(O.some), T.zip(CL.currentTime)),
            T.chain(({ tuple: [weight, current] }) =>
              pipe(
                bucket,
                Ref.modify(({ tuple: [tokens, timestamp] }) => {
                  const elapsed = current - timestamp
                  const cycles = elapsed / duration
                  const available = (() => {
                    const sum = tokens + cycles * units
                    const max = units + burst < 0 ? Number.MAX_VALUE : units + burst

                    return sum < 0 ? max : Math.min(sum, max)
                  })()

                  if (weight <= available) {
                    return Tp.tuple(
                      O.some(chunk),
                      Tp.tuple(available - weight, current)
                    )
                  } else {
                    return Tp.tuple(O.none, Tp.tuple(available, current))
                  }
                }),
                T.chain(
                  O.fold(
                    () => go,
                    (os) => T.succeed(os)
                  )
                )
              )
            )
          )
        )
        //
        return go
      }),
      M.map(({ pull }) => pull)
    )
  )
}
