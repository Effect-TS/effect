import * as Either from "@fp-ts/data/Either"

/**
 * Returns an effect that will produce the value of this effect, unless it
 * fails, in which case, it will produce the value of the specified effect.
 *
 * @tsplus static effect/core/io/Effect.Aspects orElseEither
 * @tsplus pipeable effect/core/io/Effect orElseEither
 * @category alternatives
 * @since 1.0.0
 */
export function orElseEither<R2, E2, A2>(that: LazyArg<Effect<R2, E2, A2>>) {
  return <R, E, A>(self: Effect<R, E, A>): Effect<R | R2, E2, Either.Either<A, A2>> =>
    self.tryOrElse(
      that().map(Either.right),
      (a) => Effect.succeed(Either.left(a))
    )
}
