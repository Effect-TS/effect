import type * as A from "../../Chunk"
import * as CL from "../../Clock"
import { pipe } from "../../Function"
import * as O from "../../Option"
import * as T from "../_internal/effect"
import * as M from "../_internal/managed"
import * as Ref from "../_internal/ref"
import { Stream } from "./definitions"

/**
 * Throttles the chunks of this stream according to the given bandwidth parameters using the token bucket
 * algorithm. Allows for burst in the processing of elements by allowing the token bucket to accumulate
 * tokens up to a `units + burst` threshold. Chunks that do not meet the bandwidth constraints are dropped.
 * The weight of each chunk is determined by the `costFn` effectful function.
 */
export function throttleEnforceM(units: number, duration: number, burst = 0) {
  return <O, R1, E1>(costFn: (c: A.Chunk<O>) => T.Effect<R1, E1, number>) => <R, E>(
    self: Stream<R, E, O>
  ): Stream<R & R1 & CL.HasClock, E | E1, O> =>
    new Stream(
      pipe(
        M.do,
        M.bind("chunks", () => self.proc),
        M.bind("currentTime", () => T.toManaged_(CL.currentTime)),
        M.bind("bucket", ({ currentTime }) =>
          T.toManaged_(Ref.makeRef([units, currentTime] as const))
        ),
        M.let("pull", ({ bucket, chunks }) => {
          const go: T.Effect<
            R & R1 & CL.HasClock,
            O.Option<E | E1>,
            A.Chunk<O>
          > = T.chain_(chunks, (chunk) =>
            pipe(
              pipe(costFn(chunk), T.mapError(O.some), T.zip(CL.currentTime)),
              T.chain(([weight, current]) =>
                pipe(
                  bucket,
                  Ref.modify(([tokens, timestamp]) => {
                    const elapsed = current - timestamp
                    const cycles = elapsed / duration
                    const available = (() => {
                      const sum = tokens + cycles * units
                      const max = units + burst < 0 ? Number.MAX_VALUE : units + burst

                      return sum < 0 ? max : Math.min(sum, max)
                    })()

                    if (weight <= available) {
                      return [O.some(chunk), [available - weight, current] as const]
                    } else {
                      return [O.none, [available, current] as const]
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
