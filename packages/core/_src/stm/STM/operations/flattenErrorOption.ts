/**
 * Unwraps the optional error, defaulting to the provided value.
 *
 * @tsplus fluent ets/STM flattenErrorOption
 */
export function flattenErrorOption_<R, E, A, E2>(
  self: STM<R, Option<E>, A>,
  def: LazyArg<E2>
): STM<R, E | E2, A> {
  return self.mapError((option) => option.fold(def, identity));
}

/**
 * Unwraps the optional error, defaulting to the provided value.
 *
 * @tsplus static ets/STM/Aspects flattenErrorOption
 */
export const flattenErrorOption = Pipeable(flattenErrorOption_);
