import { Chunk } from "../../../collection/immutable/Chunk"
import { FiberId } from "../../FiberId"
import { Trace } from "../definition"

/**
 * @tsplus static ets/TraceOps none
 */
export const none: Trace = Trace(FiberId.none, Chunk.empty())
