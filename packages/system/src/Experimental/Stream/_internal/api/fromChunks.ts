// ets_tracing: off

import type * as CK from "../../../../Collections/Immutable/Chunk/index.js"
import type * as C from "../core.js"
import * as Chain from "./chain.js"
import * as FromChunk from "./fromChunk.js"
import * as FromIterable from "./fromIterable.js"

/**
 * Creates a stream from an arbitrary number of chunks.
 */
export function fromChunks<O>(...chunks: CK.Chunk<O>[]): C.UIO<O> {
  return Chain.chain_(FromIterable.fromIterable(chunks), (_) => FromChunk.fromChunk(_))
}
