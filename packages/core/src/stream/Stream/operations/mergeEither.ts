import { TerminationStrategy } from "@effect/core/stream/Stream//TerminationStrategy"
import * as Either from "@fp-ts/data/Either"

/**
 * Merges this stream and the specified stream together to produce a stream of
 * eithers.
 *
 * @tsplus static effect/core/stream/Stream.Aspects mergeEither
 * @tsplus pipeable effect/core/stream/Stream mergeEither
 * @category mutations
 * @since 1.0.0
 */
export function mergeEither<R2, E2, A2>(
  that: Stream<R2, E2, A2>,
  strategy: TerminationStrategy = TerminationStrategy.Both
) {
  return <R, E, A>(self: Stream<R, E, A>): Stream<R | R2, E | E2, Either.Either<A, A2>> =>
    self.mergeWith(
      that,
      (a): Either.Either<A, A2> => Either.left(a),
      (a2): Either.Either<A, A2> => Either.right(a2),
      strategy
    )
}
