// ets_tracing: off

import type * as M from "../../../../Managed/index.js"
import type * as C from "../core.js"
import * as Flatten from "./flatten.js"
import * as Managed from "./managed.js"

/**
 * Creates a stream produced from a managed
 */
export function unwrapManaged<R0, E0, R, E, A>(
  self: M.Managed<R0, E0, C.Stream<R, E, A>>
): C.Stream<R0 & R, E0 | E, A> {
  return Flatten.flatten(Managed.managed(self))
}
