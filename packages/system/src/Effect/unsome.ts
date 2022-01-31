// ets_tracing: off

import * as O from "../Option/index.js"
import { succeed } from "./core.js"
import type { Effect } from "./effect.js"
import { fail } from "./fail.js"
import * as FM from "./foldM.js"

/**
 * Converts an option on errors into an option on values.
 */
export function unsome<R, E, A>(
  self: Effect<R, O.Option<E>, A>
): Effect<R, E, O.Option<A>> {
  return FM.foldM_(
    self,
    O.fold(() => succeed(O.emptyOf<A>()), fail),
    (a) => succeed(O.some(a))
  )
}
