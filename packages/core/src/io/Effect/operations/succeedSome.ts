import * as Option from "@fp-ts/data/Option"

/**
 * Returns an effect with the optional value.
 *
 * @tsplus static effect/core/io/Effect.Ops some
 * @category constructors
 * @since 1.0.0
 */
export function succeedSome<A>(value: A): Effect<never, never, Option.Option<A>> {
  return Effect.succeed(Option.some(value))
}
