/**
 * Unwraps the optional error, defaulting to the provided value.
 *
 * @tsplus fluent ets/Effect flattenErrorOption
 */
export function flattenErrorOption_<R, E, E1, A>(
  self: Effect<R, Option<E>, A>,
  def: LazyArg<E1>,
  __tsplusTrace?: string
): Effect<R, E | E1, A> {
  return self.mapError((e) => e.getOrElse(def))
}

/**
 * Unwraps the optional error, defaulting to the provided value.
 *
 * @tsplus static ets/Effect/Aspects flattenErrorOption
 */
export const flattenErrorOption = Pipeable(flattenErrorOption_)
