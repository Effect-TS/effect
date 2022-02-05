// ets_tracing: off

import type * as CL from "../../../../Clock/index.js"
import type * as CK from "../../../../Collections/Immutable/Chunk/index.js"
import * as T from "../../../../Effect/index.js"
import type * as C from "../core.js"
import * as ThrottleShapeEffect from "./throttleShapeEffect.js"

/**
 * Delays the chunks of this stream according to the given bandwidth parameters using the token bucket
 * algorithm. Allows for burst in the processing of elements by allowing the token bucket to accumulate
 * tokens up to a `units + burst` threshold. The weight of each chunk is determined by the `costFn`
 * function.
 */
export function throttleShape_<R, E, A>(
  self: C.Stream<R, E, A>,
  units: number,
  duration: number,
  costFn: (a: CK.Chunk<A>) => number,
  burst = 0
): C.Stream<CL.HasClock & R, E, A> {
  return ThrottleShapeEffect.throttleShapeEffect_(
    self,
    units,
    duration,
    (os) => T.succeed(costFn(os)),
    burst
  )
}

/**
 * Delays the chunks of this stream according to the given bandwidth parameters using the token bucket
 * algorithm. Allows for burst in the processing of elements by allowing the token bucket to accumulate
 * tokens up to a `units + burst` threshold. The weight of each chunk is determined by the `costFn`
 * function.
 *
 * @ets_data_first throttleShape_
 */
export function throttleShape<A>(
  units: number,
  duration: number,
  costFn: (a: CK.Chunk<A>) => number,
  burst = 0
) {
  return <R, E>(self: C.Stream<R, E, A>) =>
    throttleShape_(self, units, duration, costFn, burst)
}
