/**
 * Requires the option produced by this value to be `None`.
 *
 * @tsplus fluent ets/STM noneOrFail
 */
export function noneOrFail<R, E, A, B>(
  self: STM<R, E, Option<A>>
): STM<R, Option<E>, void> {
  return self.foldSTM(
    (e) => STM.fail(Option.some(e)),
    (option) => option.fold(STM.unit, () => STM.fail(Option.none))
  )
}
