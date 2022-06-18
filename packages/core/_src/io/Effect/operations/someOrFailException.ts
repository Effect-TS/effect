/**
 * Extracts the optional value, or fails with a `NoSuchElement` exception.
 *
 * @tsplus fluent ets/Effect someOrFailException
 */
export function someOrFailException<R, E, A>(
  self: Effect<R, E, Maybe<A>>,
  __tsplusTrace?: string
): Effect<R, E | NoSuchElement, A> {
  return self.someOrFail(new NoSuchElement())
}
