/**
 * Extracts the optional value, or returns the given 'default'.
 *
 * @tsplus fluent ets/Stream someOrElse
 */
export function someOrElse_<R, E, A, A2>(
  self: Stream<R, E, Option<A>>,
  def: LazyArg<A2>,
  __tsplusTrace?: string
): Stream<R, E, A | A2> {
  return self.map((option) => option.getOrElse(def));
}

/**
 * Extracts the optional value, or returns the given 'default'.
 *
 * @tsplus static ets/Stream/Aspects someOrElse
 */
export const someOrElse = Pipeable(someOrElse_);
