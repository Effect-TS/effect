// ets_tracing: off

import * as CK from "../../../../Collections/Immutable/Chunk"
import type * as C from "../core"
import * as FromChunk from "./fromChunk"

/**
 * Creates a stream from an iterable collection of values
 */
export function fromIterable<O>(as: Iterable<O>): C.UIO<O> {
  return FromChunk.fromChunk(CK.from(as))
}
