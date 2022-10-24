import * as Option from "@fp-ts/data/Option"

/**
 * Maps the error value of this effect to an optional value.
 *
 * @tsplus getter effect/core/io/Effect asSomeError
 * @category mapping
 * @since 1.0.0
 */
export function asSomeError<R, E, A>(self: Effect<R, E, A>): Effect<R, Option.Option<E>, A> {
  return self.mapError(Option.some)
}
