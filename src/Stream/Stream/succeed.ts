import type { UIO } from "./definitions"
import { fromChunk } from "./fromChunk"

/**
 * Creates a single-valued pure stream
 */
export const succeed = <A>(a: A): UIO<A> => fromChunk([a])
