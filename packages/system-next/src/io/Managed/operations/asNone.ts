import * as O from "../../../data/Option"
import type { Managed } from "../definition"
import { failNow } from "./failNow"
import { foldManaged_ } from "./foldManaged"
import { succeedNow } from "./succeedNow"

/**
 * Requires the option produced by this value to be `None`.
 */
export function asNone<R, E, A>(
  self: Managed<R, E, O.Option<A>>,
  __trace?: string
): Managed<R, O.Option<E>, void> {
  return foldManaged_(
    self,
    (e) => failNow(O.some(e)),
    O.fold(
      () => failNow(O.none),
      () => succeedNow(undefined)
    )
  )
}
