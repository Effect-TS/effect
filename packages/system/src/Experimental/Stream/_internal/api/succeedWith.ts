// ets_tracing: off

import * as CK from "../../../../Collections/Immutable/Chunk"
import type * as C from "../core"
import * as FromChunkWith from "./fromChunkWith"

/**
 * Creates a single-valued pure stream
 */
export function succeedWith<O>(o: () => O): C.UIO<O> {
  return FromChunkWith.fromChunkWith(() => CK.single(o()))
}
