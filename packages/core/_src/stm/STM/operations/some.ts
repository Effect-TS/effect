/**
 * Converts an option on values into an option on errors.
 *
 * @tsplus getter ets/STM some
 */
export function some<R, E, A>(self: STM<R, E, Option<A>>): STM<R, Option<E>, A> {
  return self.foldSTM(
    (e) => STM.fail(Option.some(e)),
    (option) => option.fold(STM.fail(Option.none), STM.succeedNow)
  )
}
