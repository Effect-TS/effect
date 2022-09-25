import {
  concreteStream,
  StreamInternal
} from "@effect/core/stream/Stream/operations/_internal/StreamInternal"
import { DurationInternal } from "@tsplus/stdlib/data/Duration"

/**
 * Delays the chunks of this stream according to the given bandwidth
 * parameters using the token bucket algorithm. Allows for burst in the
 * processing of elements by allowing the token bucket to accumulate tokens up
 * to a `units + burst` threshold. The weight of each chunk is determined by
 * the `costFn` effectful function.
 *
 * @tsplus static effect/core/stream/Stream.Aspects throttleShapeEffect
 * @tsplus pipeable effect/core/stream/Stream throttleShapeEffect
 */
export function throttleShapeEffect<A, R2, E2>(
  units: number,
  duration: Duration,
  costFn: (input: Chunk<A>) => Effect<R2, E2, number>,
  burst = 0
) {
  return <R, E>(self: Stream<R, E, A>): Stream<R | R2, E | E2, A> => {
    concreteStream(self)
    return new StreamInternal(
      Channel.fromEffect(Clock.currentTime)
        .flatMap(
          (timestamp) =>
            self.channel >>
            loop<E, A, R2, E2>(units, duration, costFn, burst, units, timestamp)
        )
    )
  }
}

function loop<E, A, R2, E2>(
  units: number,
  duration: Duration,
  costFn: (input: Chunk<A>) => Effect<R2, E2, number>,
  burst: number,
  tokens: number,
  timestamp: number
): Channel<R2, E | E2, Chunk<A>, unknown, E | E2, Chunk<A>, void> {
  return Channel.readWith(
    (input: Chunk<A>) =>
      Channel.unwrap(
        costFn(input)
          .zip(Clock.currentTime)
          .map(({ tuple: [weight, current] }) => {
            const elapsed = current - timestamp
            const cycles = elapsed / duration.millis
            const sum = tokens + cycles * units
            const max = units + burst < 0 ? Number.MAX_SAFE_INTEGER : units + burst
            const available = sum < 0 ? max : Math.min(sum, max)
            const remaining = available - weight
            const waitCycles = remaining >= 0 ? 0 : -remaining / units
            const delay = new DurationInternal(Math.floor(waitCycles * duration.millis))

            return delay > (0).millis
              ? Channel.fromEffect(Clock.sleep(delay))
                .flatMap(() => Channel.write(input))
                .flatMap(() =>
                  loop<E, A, R2, E2>(units, duration, costFn, burst, remaining, current)
                )
              : Channel.write(input).flatMap(() =>
                loop<E, A, R2, E2>(units, duration, costFn, burst, remaining, current)
              )
          })
      ),
    (err) => Channel.fail(err),
    () => Channel.unit
  )
}
