// ets_tracing: off

import * as CK from "../../../../Collections/Immutable/Chunk"
import * as M from "../../../../Managed"
import * as CH from "../../Channel"
import * as C from "../core"

/**
 * Creates a single-valued stream from a managed resource
 */
export function managed<R, E, A>(self: M.Managed<R, E, A>): C.Stream<R, E, A> {
  return new C.Stream(CH.managedOut(M.map_(self, CK.single)))
}
