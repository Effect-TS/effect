import type { Chunk } from "../../../collection/immutable/Chunk"
import { Duration } from "../../../data/Duration"
import type { LazyArg } from "../../../data/Function"
import type { HasClock } from "../../../io/Clock"
import { Clock } from "../../../io/Clock"
import type { Effect } from "../../../io/Effect"
import { Channel } from "../../Channel"
import type { Stream } from "../definition"
import { concreteStream, StreamInternal } from "./_internal/StreamInternal"

/**
 * Delays the chunks of this stream according to the given bandwidth
 * parameters using the token bucket algorithm. Allows for burst in the
 * processing of elements by allowing the token bucket to accumulate tokens up
 * to a `units + burst` threshold. The weight of each chunk is determined by
 * the `costFn` effectful function.
 *
 * @tsplus fluent ets/Stream throttleShapeEffect
 */
export function throttleShapeEffect_<R, E, A, R2, E2>(
  self: Stream<R, E, A>,
  units: number,
  duration: LazyArg<Duration>,
  costFn: (input: Chunk<A>) => Effect<R2, E2, number>,
  burst = 0,
  __tsplusTrace?: string
): Stream<R & R2 & HasClock, E | E2, A> {
  concreteStream(self)
  return new StreamInternal(
    Channel.succeed(duration)
      .zip(Channel.fromEffect(Clock.currentTime))
      .flatMap(
        ({ tuple: [duration, timestamp] }) =>
          self.channel >>
          loop<E, A, R2, E2>(units, duration, costFn, burst, units, timestamp)
      )
  )
}

/**
 * Delays the chunks of this stream according to the given bandwidth
 * parameters using the token bucket algorithm. Allows for burst in the
 * processing of elements by allowing the token bucket to accumulate tokens up
 * to a `units + burst` threshold. The weight of each chunk is determined by
 * the `costFn` effectful function.
 */
export const throttleShapeEffect = Pipeable(throttleShapeEffect_)

function loop<E, A, R2, E2>(
  units: number,
  duration: Duration,
  costFn: (input: Chunk<A>) => Effect<R2, E2, number>,
  burst: number,
  tokens: number,
  timestamp: number,
  __tsplusTrace?: string
): Channel<R2 & HasClock, E | E2, Chunk<A>, unknown, E | E2, Chunk<A>, void> {
  return Channel.readWith(
    (input: Chunk<A>) =>
      Channel.unwrap(
        costFn(input)
          .zip(Clock.currentTime)
          .map(({ tuple: [weight, current] }) => {
            const elapsed = current - timestamp
            const cycles = elapsed / duration.milliseconds
            const sum = tokens + cycles * units
            const max = units + burst < 0 ? Number.MAX_SAFE_INTEGER : units + burst
            const available = sum < 0 ? max : Math.min(sum, max)
            const remaining = available - weight
            const waitCycles = remaining >= 0 ? 0 : -remaining / units
            const delay = Duration(Math.floor(waitCycles * duration.milliseconds))

            return delay > Duration.Zero
              ? Channel.fromEffect(Clock.sleep(delay.milliseconds)) >
                  Channel.write(input) >
                  loop<E, A, R2, E2>(units, duration, costFn, burst, remaining, current)
              : Channel.write(input) >
                  loop<E, A, R2, E2>(units, duration, costFn, burst, remaining, current)
          })
      ),
    (err) => Channel.fail(err),
    () => Channel.unit
  )
}
