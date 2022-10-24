import type { Duration } from "@fp-ts/data/Duration"
import * as Option from "@fp-ts/data/Option"

/**
 * Ends the stream if it does not produce a value after the specified duration.
 *
 * @tsplus static effect/core/stream/Stream.Aspects timeout
 * @tsplus pipeable effect/core/stream/Stream timeout
 * @category mutations
 * @since 1.0.0
 */
export function timeout(duration: Duration) {
  return <R, E, A>(self: Stream<R, E, A>): Stream<R, E, A> =>
    Stream.fromPull(
      self.toPull.map((pull) => pull.timeoutFail(Option.none, duration))
    )
}
