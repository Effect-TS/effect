/**
 * Returns an effect with the value on the left part.
 *
 * @tsplus static effect/core/io/Effect.Ops left
 */
export function succeedLeft<A>(value: A): Effect<never, never, Either<A, never>> {
  return Effect.succeed(Either.left(value))
}
