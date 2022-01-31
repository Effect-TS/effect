// ets_tracing: off

import * as CK from "../../../../Collections/Immutable/Chunk"
import * as CH from "../../Channel"
import * as C from "../core.js"

/**
 * Repeats the provided value infinitely.
 */
export function repeat<A>(a: A): C.UIO<A> {
  return new C.Stream(CH.repeated(CH.write(CK.single(a))))
}
