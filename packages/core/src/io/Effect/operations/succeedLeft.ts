import * as Either from "@fp-ts/data/Either"

/**
 * Returns an effect with the value on the left part.
 *
 * @tsplus static effect/core/io/Effect.Ops left
 * @category constructors
 * @since 1.0.0
 */
export function succeedLeft<A>(value: A): Effect<never, never, Either.Either<A, never>> {
  return Effect.succeed(Either.left(value))
}
