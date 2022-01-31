// ets_tracing: off

import * as O from "../Option/index.js"
import type { Sync as Effect } from "./core.js"
import { fail, foldM_, succeed } from "./core.js"

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
