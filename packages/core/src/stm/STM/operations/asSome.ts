import * as Option from "@fp-ts/data/Option"

/**
 * Maps the success value of this effect to an optional value.
 *
 * @tsplus getter effect/core/stm/STM asSome
 * @category mapping
 * @since 1.0.0
 */
export function asSome<R, E, A>(self: STM<R, E, A>): STM<R, E, Option.Option<A>> {
  return self.map(Option.some)
}
