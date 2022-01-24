import * as Chunk from "../../../collection/immutable/Chunk/core"
import * as FiberId from "../../FiberId/definition"
import { Trace } from "../definition"

export const none: Trace = new Trace(new FiberId.None(), Chunk.empty())
