// tracing: off

import * as A from "../../Collections/Immutable/Chunk"
import type { UIO } from "./definitions"
import { fromChunk } from "./fromChunk"

/**
 * Creates a single-valued pure stream
 */
export function succeed<A>(a: A): UIO<A> {
  return fromChunk(A.single(a))
}
