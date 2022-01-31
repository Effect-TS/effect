// ets_tracing: off

import * as O from "../Option/index.js"
import { succeed } from "./core.js"
import type { Effect } from "./effect.js"
import { fail } from "./fail.js"
import { foldM_ } from "./foldM.js"

/**
 * Converts an option on errors into an option on values.
 */
export function optional<R, E, A>(
  self: Effect<R, O.Option<E>, A>,
  __trace?: string
): Effect<R, E, O.Option<A>> {
  return foldM_(
    self,
    O.fold(() => succeed(O.none), fail),
    (a) => succeed(O.some(a)),
    __trace
  )
}
