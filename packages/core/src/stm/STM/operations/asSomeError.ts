import * as Option from "@fp-ts/data/Option"

/**
 * Maps the error value of this effect to an optional value.
 *
 * @tsplus getter effect/core/stm/STM asSomeError
 * @category mapping
 * @since 1.0.0
 */
export function asSomeError<R, E, A>(self: STM<R, E, A>): STM<R, Option.Option<E>, A> {
  return self.mapError(Option.some)
}
