import * as Either from "@fp-ts/data/Either"

/**
 * Switches to the provided stream in case this one fails with a typed error.
 *
 * See also `Stream.catchAll`.
 *
 * @tsplus static effect/core/stream/Stream.Aspects orElseEither
 * @tsplus pipeable effect/core/stream/Stream orElseEither
 * @category alternatives
 * @since 1.0.0
 */
export function orElseEither<R2, E2, A2>(
  that: LazyArg<Stream<R2, E2, A2>>
) {
  return <R, E, A>(self: Stream<R, E, A>): Stream<R | R2, E | E2, Either.Either<A, A2>> =>
    self.map(Either.left) | that().map(Either.right)
}
