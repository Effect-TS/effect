// ets_tracing: off

import * as O from "../Option/index.js"
import { succeed } from "./core.js"
import type { Effect } from "./effect.js"
import { fail } from "./fail.js"
import { foldM_ } from "./foldM.js"

/**
 * Converts an option on values into an option on errors.
 */
export function some<R, E, A>(
  self: Effect<R, E, O.Option<A>>,
  __trace?: string
): Effect<R, O.Option<E>, A> {
  return foldM_(
    self,
    (e) => fail(O.some(e)),
    O.fold(() => fail(O.none), succeed),
    __trace
  )
}
