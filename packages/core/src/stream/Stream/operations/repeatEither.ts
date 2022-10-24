import * as Either from "@fp-ts/data/Either"

/**
 * Repeats the entire stream using the specified schedule. The stream will
 * execute normally, and then repeat again according to the provided schedule.
 * The schedule output will be emitted at the end of each repetition.
 *
 * @tsplus static effect/core/stream/Stream.Aspects repeatEither
 * @tsplus pipeable effect/core/stream/Stream repeatEither
 * @category repetition
 * @since 1.0.0
 */
export function repeatEither<S, R2, B>(
  schedule: Schedule<S, R2, unknown, B>
) {
  return <R, E, A>(self: Stream<R, E, A>): Stream<R | R2, E, Either.Either<B, A>> =>
    self.repeatWith(
      schedule,
      (a) => Either.right(a),
      (b) => Either.left(b)
    )
}
