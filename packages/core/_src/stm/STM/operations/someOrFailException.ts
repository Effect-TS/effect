/**
 * Extracts the optional value, or fails with a `NoSuchElement` exception.
 *
 * @tsplus fluent ets/STM someOrFailException
 */
export function someOrFailException<R, E, A>(
  self: STM<R, E, Option<A>>
): STM<R, E | NoSuchElement, A> {
  return self.someOrFail(new NoSuchElement());
}
