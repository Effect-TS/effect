import type { Duration } from "@fp-ts/data/Duration"
import * as Option from "@fp-ts/data/Option"

/**
 * Fails the stream with given cause if it does not produce a value after the
 * specified duration.
 *
 * @tsplus static effect/core/stream/Stream.Aspects timeoutFailCause
 * @tsplus pipeable effect/core/stream/Stream timeoutFailCause
 * @category mutations
 * @since 1.0.0
 */
export function timeoutFailCause<E2>(cause: LazyArg<Cause<E2>>, duration: Duration) {
  return <R, E, A>(self: Stream<R, E, A>): Stream<R, E | E2, A> =>
    Stream.fromPull<R, E | E2, A>(
      self.toPull.map((pull) => pull.timeoutFailCause(cause().map(Option.some), duration))
    )
}
