import * as L from "../../../collection/immutable/List/core"
import { Option } from "../../../data/Option/core"
import type { Cause } from "../definition"

/**
 * Extracts a list of non-recoverable errors from the `Cause`.
 *
 * @ets fluent ets/Cause defects
 */
export function defects<E>(self: Cause<E>): L.List<unknown> {
  return L.reverse(
    self.foldLeft(L.empty<unknown>(), (causes, cause) =>
      cause.isDieType() ? Option.some(L.prepend_(causes, cause.value)) : Option.none
    )
  )
}
