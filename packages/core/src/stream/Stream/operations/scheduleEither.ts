import * as Either from "@fp-ts/data/Either"

/**
 * Schedules the output of the stream using the provided `schedule` and emits
 * its output at the end (if `schedule` is finite).
 *
 * @tsplus static effect/core/stream/Stream.Aspects scheduleEither
 * @tsplus pipeable effect/core/stream/Stream scheduleEither
 * @category mutations
 * @since 1.0.0
 */
export function scheduleEither<S, R2, A, B>(schedule: Schedule<S, R2, A, B>) {
  return <R, E>(self: Stream<R, E, A>): Stream<R | R2, E, Either.Either<B, A>> =>
    self.scheduleWith(
      schedule,
      (a) => Either.right(a),
      (b) => Either.left(b)
    )
}
