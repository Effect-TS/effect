/**
 * Extracts the optional value, or fails with a `NoSuchElement` exception.
 *
 * @tsplus getter effect/core/io/Effect someOrFailException
 */
export function someOrFailException<R, E, A>(
  self: Effect<R, E, Maybe<A>>
): Effect<R, E | NoSuchElement, A> {
  return self.someOrFail(new NoSuchElement())
}
