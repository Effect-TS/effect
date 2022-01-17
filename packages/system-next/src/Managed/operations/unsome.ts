import * as O from "../../Option"
import type { Managed } from "../definition"
import { failNow } from "./failNow"
import { foldManaged_ } from "./foldManaged"
import { succeedNow } from "./succeedNow"

/**
 * Converts an option on errors into an option on values.
 */
export function unsome<R, E, A>(
  self: Managed<R, O.Option<E>, A>,
  __trace?: string
): Managed<R, E, O.Option<A>> {
  return foldManaged_(
    self,
    O.fold(() => succeedNow(O.none), failNow),
    (a) => succeedNow(O.some(a)),
    __trace
  )
}
