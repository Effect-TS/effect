import * as Either from "@fp-ts/data/Either"
import * as Option from "@fp-ts/data/Option"

/**
 * Schedules the output of the stream using the provided `schedule`.
 *
 * @tsplus static effect/core/stream/Stream.Aspects schedule
 * @tsplus pipeable effect/core/stream/Stream schedule
 * @category mutations
 * @since 1.0.0
 */
export function schedule<S, R2, A, B>(schedule: Schedule<S, R2, A, B>) {
  return <R, E>(self: Stream<R, E, A>): Stream<R | R2, E, A> =>
    self
      .scheduleEither(schedule)
      .collect((either) => Either.isRight(either) ? Option.some(either.right) : Option.none)
}
