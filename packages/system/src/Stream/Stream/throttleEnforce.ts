// ets_tracing: off

import type { HasClock } from "../../Clock/index.js"
import type * as A from "../../Collections/Immutable/Chunk/index.js"
import * as T from "../_internal/effect.js"
import type { Stream } from "./definitions.js"
import { throttleEnforceM_ } from "./throttleEnforceM.js"

/**
 * Throttles the chunks of this stream according to the given bandwidth parameters using the token bucket
 * algorithm. Allows for burst in the processing of elements by allowing the token bucket to accumulate
 * tokens up to a `units + burst` threshold. Chunks that do not meet the bandwidth constraints are dropped.
 * The weight of each chunk is determined by the `costFn` function.
 *
 * @ets_data_first throttleEnforce_
 */
export function throttleEnforce<O>(
  costFn: (c: A.Chunk<O>) => number,
  units: number,
  duration: number,
  burst = 0
): <R, E>(self: Stream<R, E, O>) => Stream<R & HasClock, E, O> {
  return (self) => throttleEnforce_(self, costFn, units, duration, burst)
}

/**
 * Throttles the chunks of this stream according to the given bandwidth parameters using the token bucket
 * algorithm. Allows for burst in the processing of elements by allowing the token bucket to accumulate
 * tokens up to a `units + burst` threshold. Chunks that do not meet the bandwidth constraints are dropped.
 * The weight of each chunk is determined by the `costFn` function.
 */
export function throttleEnforce_<R, E, O>(
  self: Stream<R, E, O>,
  costFn: (c: A.Chunk<O>) => number,
  units: number,
  duration: number,
  burst = 0
): Stream<R & HasClock, E, O> {
  return throttleEnforceM_(self, (os) => T.succeed(costFn(os)), units, duration, burst)
}
