import * as O from "../../data/Option"
import type { Sync as Effect } from "./core"
import { fail, foldM_, succeed } from "./core"

/**
 * Converts an option on errors into an option on values.
 */
export function optional<R, E, A>(
  self: Effect<R, O.Option<E>, A>
): Effect<R, E, O.Option<A>> {
  return foldM_(
    self,
    O.fold(() => succeed(O.none), fail),
    (a) => succeed(O.some(a))
  )
}
