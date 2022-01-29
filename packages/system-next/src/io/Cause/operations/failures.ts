import * as L from "../../../collection/immutable/List/core"
import { Option } from "../../../data/Option/core"
import type { Cause } from "../definition"

/**
 * Produces a list of all recoverable errors `E` in the `Cause`.
 *
 * @ets fluent ets/Cause failures
 */
export function failures<E>(self: Cause<E>): L.List<E> {
  return self.foldLeft(L.empty<E>(), (acc, curr) =>
    curr.isFailType() ? Option.some(L.prepend_(acc, curr.value)) : Option.some(acc)
  )
}
