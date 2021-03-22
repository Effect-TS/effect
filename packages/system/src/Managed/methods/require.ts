import * as O from "../../Option"
import * as M from "../core"
import type { Managed } from "../managed"
import { succeed } from "../succeed"

/**
 * Requires that the given `Managed<R, E, Option<A>>` contain a value. If there is no
 * value, then the specified error will be raised.
 */
export function require_<R, E, A, E1>(
  self: Managed<R, E, O.Option<A>>,
  error: () => E1
): Managed<R, E | E1, A> {
  return M.chain_(
    self,
    O.fold(() => M.fail(error()), succeed)
  )
}

/**
 * Requires that the given `Managed<R, E, Option<A>>` contain a value. If there is no
 * value, then the specified error will be raised.
 */
export function require<E1>(
  error: () => E1
): <R, E, A>(self: Managed<R, E, O.Option<A>>) => Managed<R, E | E1, A> {
  return (self) => require_(self, error)
}
