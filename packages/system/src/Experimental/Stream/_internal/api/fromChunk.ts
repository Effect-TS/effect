// ets_tracing: off

import * as CK from "../../../../Collections/Immutable/Chunk"
import * as CH from "../../Channel"
import * as C from "../core.js"

/**
 * Creates a stream from a `Chunk` of values
 *
 * @param c a chunk of values
 * @return a finite stream of values
 */
export function fromChunk<O>(c: CK.Chunk<O>): C.UIO<O> {
  return new C.Stream(CH.suspend(() => (CK.isEmpty(c) ? CH.unit : CH.write(c))))
}
