/**
 * Maps the success value of this effect to an optional value.
 *
 * @tsplus getter effect/core/stm/STM asSome
 */
export function asSome<R, E, A>(self: STM<R, E, A>): STM<R, E, Maybe<A>> {
  return self.map(Maybe.some)
}
