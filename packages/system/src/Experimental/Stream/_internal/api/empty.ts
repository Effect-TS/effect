// ets_tracing: off

import * as CK from "../../../../Collections/Immutable/Chunk/index.js"
import * as FromChunk from "./fromChunk.js"

/**
 * Empty stream
 */
export const empty = FromChunk.fromChunk(CK.empty<never>())
