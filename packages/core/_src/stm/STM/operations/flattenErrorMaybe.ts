/**
 * Unwraps the optional error, defaulting to the provided value.
 *
 * @tsplus fluent ets/STM flattenErrorMaybe
 */
export function flattenErrorMaybe_<R, E, A, E2>(
  self: STM<R, Maybe<E>, A>,
  def: LazyArg<E2>
): STM<R, E | E2, A> {
  return self.mapError((option) => option.fold(def, identity))
}

/**
 * Unwraps the optional error, defaulting to the provided value.
 *
 * @tsplus static ets/STM/Aspects flattenErrorMaybe
 */
export const flattenErrorMaybe = Pipeable(flattenErrorMaybe_)
