import * as Chunk from "../../Collections/Immutable/Chunk/core"
import * as FiberId from "../../FiberId/definition"
import { Trace } from "../definition"

export const none: Trace = new Trace(new FiberId.None(), Chunk.empty())
