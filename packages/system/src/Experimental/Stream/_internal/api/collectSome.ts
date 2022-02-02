// ets_tracing: off

import type * as O from "../../../../Option"
import type * as C from "../core"
import * as Collect from "./collect"

/**
 * Filters any `None` values.
 */
export function collectSome<R, E, A>(
  self: C.Stream<R, E, O.Option<A>>
): C.Stream<R, E, A> {
  return Collect.collect_(self, (a) => a)
}
