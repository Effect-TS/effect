/**
 * Produces a list of all recoverable errors `E` in the `Cause`.
 *
 * @tsplus getter ets/Cause failures
 */
export function failures<E>(self: Cause<E>): List<E> {
  return self
    .foldLeft(
      List.empty<E>(),
      (acc, curr) => curr.isFailType() ? Maybe.some(acc.prepend(curr.value)) : Maybe.some(acc)
    )
    .reverse
}
