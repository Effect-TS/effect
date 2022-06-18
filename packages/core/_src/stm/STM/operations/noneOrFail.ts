/**
 * Requires the option produced by this value to be `None`.
 *
 * @tsplus getter ets/STM noneOrFail
 */
export function noneOrFail<R, E, A, B>(
  self: STM<R, E, Maybe<A>>
): STM<R, Maybe<E>, void> {
  return self.foldSTM(
    (e) => STM.fail(Maybe.some(e)),
    (option) => option.fold(STM.unit, () => STM.fail(Maybe.none))
  )
}
