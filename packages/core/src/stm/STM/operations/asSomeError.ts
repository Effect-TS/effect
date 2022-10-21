/**
 * Maps the error value of this effect to an optional value.
 *
 * @tsplus getter effect/core/stm/STM asSomeError
 */
export function asSomeError<R, E, A>(self: STM<R, E, A>): STM<R, Maybe<E>, A> {
  return self.mapError(Maybe.some)
}
