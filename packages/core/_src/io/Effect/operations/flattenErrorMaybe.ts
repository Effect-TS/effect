/**
 * Unwraps the optional error, defaulting to the provided value.
 *
 * @tsplus fluent ets/Effect flattenErrorMaybe
 */
export function flattenErrorMaybe_<R, E, E1, A>(
  self: Effect<R, Maybe<E>, A>,
  def: LazyArg<E1>,
  __tsplusTrace?: string
): Effect<R, E | E1, A> {
  return self.mapError((e) => e.getOrElse(def))
}

/**
 * Unwraps the optional error, defaulting to the provided value.
 *
 * @tsplus static ets/Effect/Aspects flattenErrorMaybe
 */
export const flattenErrorMaybe = Pipeable(flattenErrorMaybe_)
