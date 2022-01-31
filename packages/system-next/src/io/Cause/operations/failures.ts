import { List } from "../../../collection/immutable/List"
import { Option } from "../../../data/Option/core"
import type { Cause } from "../definition"

/**
 * Produces a list of all recoverable errors `E` in the `Cause`.
 *
 * @ets fluent ets/Cause failures
 */
export function failures<E>(self: Cause<E>): List<E> {
  return self.foldLeft(List.empty<E>(), (acc, curr) =>
    curr.isFailType() ? Option.some(acc.prepend(curr.value)) : Option.some(acc)
  )
}
