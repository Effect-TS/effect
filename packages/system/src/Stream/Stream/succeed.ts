// ets_tracing: off

import * as A from "../../Collections/Immutable/Chunk/index.js"
import type { UIO } from "./definitions.js"
import { fromChunk } from "./fromChunk.js"

/**
 * Creates a single-valued pure stream
 */
export function succeed<A>(a: A): UIO<A> {
  return fromChunk(A.single(a))
}
