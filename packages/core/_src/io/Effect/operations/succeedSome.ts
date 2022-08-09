/**
 * Returns an effect with the optional value.
 *
 * @tsplus static effect/core/io/Effect.Ops some
 */
export function succeedSome<A>(value: A): Effect<never, never, Maybe<A>> {
  return Effect.succeed(Maybe.some(value))
}
