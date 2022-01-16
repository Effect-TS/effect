// ets_tracing: off

import * as Chunk from "../../Collections/Immutable/Chunk"
import * as FiberId from "../../FiberId"
import { Trace } from "../definition"

export const none: Trace = new Trace(new FiberId.None(), Chunk.empty())
