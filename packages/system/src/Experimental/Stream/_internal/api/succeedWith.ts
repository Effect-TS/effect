// ets_tracing: off

import * as CK from "../../../../Collections/Immutable/Chunk/index.js"
import type * as C from "../core.js"
import * as FromChunkWith from "./fromChunkWith.js"

/**
 * Creates a single-valued pure stream
 */
export function succeedWith<O>(o: () => O): C.UIO<O> {
  return FromChunkWith.fromChunkWith(() => CK.single(o()))
}
