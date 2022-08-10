/**
 * Converts an option on errors into an option on values.
 *
 * @tsplus getter effect/core/stm/STM unsome
 */
export function unsome<R, E, A>(self: STM<R, Maybe<E>, A>): STM<R, E, Maybe<A>> {
  return self.foldSTM(
    (option) => option.fold(STM.succeed(Maybe.empty<A>()), STM.fail),
    (a) => STM.succeed(Maybe.some(a))
  )
}
