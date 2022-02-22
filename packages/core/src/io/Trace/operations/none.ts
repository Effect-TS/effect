import { Chunk } from "../../../collection/immutable/Chunk"
import { FiberId } from "../../FiberId"
import { Trace } from "../definition"

export const none: Trace = new Trace(FiberId.none, Chunk.empty())
