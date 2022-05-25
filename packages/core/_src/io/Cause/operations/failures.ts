/**
 * Produces a list of all recoverable errors `E` in the `Cause`.
 *
 * @tsplus fluent ets/Cause failures
 */
export function failures<E>(self: Cause<E>): List<E> {
  return self
    .foldLeft(
      List.empty<E>(),
      (acc, curr) => curr.isFailType() ? Option.some(acc.prepend(curr.value)) : Option.some(acc)
    )
    .reverse()
}
