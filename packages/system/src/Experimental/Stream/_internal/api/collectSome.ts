// ets_tracing: off

import type * as O from "../../../../Option/index.js"
import type * as C from "../core.js"
import * as Collect from "./collect.js"

/**
 * Filters any `None` values.
 */
export function collectSome<R, E, A>(
  self: C.Stream<R, E, O.Option<A>>
): C.Stream<R, E, A> {
  return Collect.collect_(self, (a) => a)
}
