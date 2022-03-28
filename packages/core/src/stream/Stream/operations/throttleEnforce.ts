import type { Chunk } from "../../../collection/immutable/Chunk"
import type { Duration } from "../../../data/Duration"
import type { LazyArg } from "../../../data/Function"
import type { HasClock } from "../../../io/Clock"
import { Effect } from "../../../io/Effect"
import type { Stream } from "../definition"

/**
 * Throttles the chunks of this stream according to the given bandwidth
 * parameters using the token bucket algorithm. Allows for burst in the
 * processing of elements by allowing the token bucket to accumulate tokens up
 * to a `units + burst` threshold. Chunks that do not meet the bandwidth
 * constraints are dropped. The weight of each chunk is determined by the
 * `costFn` function.
 *
 * @tsplus fluent ets/Stream throttleEnforce
 */
export function throttleEnforce_<R, E, A>(
  self: Stream<R, E, A>,
  units: number,
  duration: LazyArg<Duration>,
  costFn: (input: Chunk<A>) => number,
  burst = 0,
  __tsplusTrace?: string
): Stream<R & HasClock, E, A> {
  return self.throttleEnforceEffect(
    units,
    duration,
    (input) => Effect.succeedNow(costFn(input)),
    burst
  )
}

/**
 * Throttles the chunks of this stream according to the given bandwidth
 * parameters using the token bucket algorithm. Allows for burst in the
 * processing of elements by allowing the token bucket to accumulate tokens up
 * to a `units + burst` threshold. Chunks that do not meet the bandwidth
 * constraints are dropped. The weight of each chunk is determined by the
 * `costFn` function.
 */
export const throttleEnforce = Pipeable(throttleEnforce_)
