/**
 * Converts an option on errors into an option on values.
 *
 * @tsplus getter ets/STM unsome
 */
export function unsome<R, E, A>(self: STM<R, Option<E>, A>): STM<R, E, Option<A>> {
  return self.foldSTM(
    (option) => option.fold(STM.succeedNow(Option.emptyOf<A>()), STM.failNow),
    (a) => STM.succeedNow(Option.some(a))
  )
}
