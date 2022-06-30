/**
 * Converts an option on errors into an option on values.
 *
 * @tsplus getter effect/core/stm/STM unsome
 */
export function unsome<R, E, A>(self: STM<R, Maybe<E>, A>): STM<R, E, Maybe<A>> {
  return self.foldSTM(
    (option) => option.fold(STM.succeedNow(Maybe.emptyOf<A>()), STM.failNow),
    (a) => STM.succeedNow(Maybe.some(a))
  )
}
