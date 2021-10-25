// ets_tracing: off

import * as CK from "../../../../Collections/Immutable/Chunk"
import * as FromChunk from "./fromChunk"

/**
 * Empty stream
 */
export const empty = FromChunk.fromChunk(CK.empty<never>())
