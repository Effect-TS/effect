/**
 * Extracts the optional value, or returns the given 'orElse'.
 *
 * @tsplus fluent ets/Effect someOrElse
 */
export function someOrElse_<R, E, A, B>(
  self: Effect<R, E, Option<A>>,
  orElse: LazyArg<B>,
  __tsplusTrace?: string
): Effect<R, E, A | B> {
  return self.map((option) => option.getOrElse(orElse));
}

/**
 * Extracts the optional value, or returns the given 'orElse'.
 *
 * @tsplus static ets/Effect/Aspects someOrElse
 */
export const someOrElse = Pipeable(someOrElse_);
