// ets_tracing: off

import * as CK from "../../../../Collections/Immutable/Chunk/index.js"
import * as M from "../../../../Managed/index.js"
import * as CH from "../../Channel/index.js"
import * as C from "../core.js"

/**
 * Creates a single-valued stream from a managed resource
 */
export function managed<R, E, A>(self: M.Managed<R, E, A>): C.Stream<R, E, A> {
  return new C.Stream(CH.managedOut(M.map_(self, CK.single)))
}
