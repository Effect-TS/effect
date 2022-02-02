// ets_tracing: off

import type * as M from "../../../../Managed"
import type * as C from "../core"
import * as Flatten from "./flatten"
import * as Managed from "./managed"

/**
 * Creates a stream produced from a managed
 */
export function unwrapManaged<R0, E0, R, E, A>(
  self: M.Managed<R0, E0, C.Stream<R, E, A>>
): C.Stream<R0 & R, E0 | E, A> {
  return Flatten.flatten(Managed.managed(self))
}
