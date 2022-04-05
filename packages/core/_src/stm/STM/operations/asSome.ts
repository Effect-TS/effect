/**
 * Maps the success value of this effect to an optional value.
 *
 * @tsplus fluent ets/STM asSome
 */
export function asSome<R, E, A>(self: STM<R, E, A>): STM<R, E, Option<A>> {
  return self.map(Option.some);
}
