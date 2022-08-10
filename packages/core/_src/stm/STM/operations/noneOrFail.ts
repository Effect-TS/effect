/**
 * Requires the option produced by this value to be `None`.
 *
 * @tsplus getter effect/core/stm/STM noneOrFail
 */
export function noneOrFail<R, E, A, B>(
  self: STM<R, E, Maybe<A>>
): STM<R, Maybe<E>, void> {
  return self.foldSTM(
    (e) => STM.failSync(Maybe.some(e)),
    (option) => option.fold(STM.unit, () => STM.failSync(Maybe.none))
  )
}
