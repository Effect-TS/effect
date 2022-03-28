import type { Chunk } from "../../../collection/immutable/Chunk"
import type { Duration } from "../../../data/Duration"
import type { LazyArg } from "../../../data/Function"
import type { HasClock } from "../../../io/Clock"
import { Effect } from "../../../io/Effect"
import type { Stream } from "../definition"

/**
 * Delays the chunks of this stream according to the given bandwidth
 * parameters using the token bucket algorithm. Allows for burst in the
 * processing of elements by allowing the token bucket to accumulate tokens up
 * to a `units + burst` threshold. The weight of each chunk is determined by
 * the `costFn` function.
 *
 * @tsplus fluent ets/Stream throttleShape
 */
export function throttleShape_<R, E, A>(
  self: Stream<R, E, A>,
  units: number,
  duration: LazyArg<Duration>,
  costFn: (input: Chunk<A>) => number,
  burst = 0,
  __tsplusTrace?: string
): Stream<R & HasClock, E, A> {
  return self.throttleShapeEffect(
    units,
    duration,
    (input) => Effect.succeedNow(costFn(input)),
    burst
  )
}

/**
 * Delays the chunks of this stream according to the given bandwidth
 * parameters using the token bucket algorithm. Allows for burst in the
 * processing of elements by allowing the token bucket to accumulate tokens up
 * to a `units + burst` threshold. The weight of each chunk is determined by
 * the `costFn` function.
 */
export const throttleShape = Pipeable(throttleShape_)
