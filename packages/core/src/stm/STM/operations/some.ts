/**
 * Converts an option on values into an option on errors.
 *
 * @tsplus getter effect/core/stm/STM some
 */
export function some<R, E, A>(self: STM<R, E, Maybe<A>>): STM<R, Maybe<E>, A> {
  return self.foldSTM(
    (e) => STM.fail(Maybe.some(e)),
    (option) => option.fold(STM.fail(Maybe.none), STM.succeed)
  )
}
