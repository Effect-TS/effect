import * as C from "../../Collections/Immutable/Chunk/core"
import { _roots } from "../context"
import type { Runtime } from "../definition"
import * as T from "./_internal/effect"

/**
 * Returns a chunk containing all root fibers. Due to concurrency, the
 * returned chunk is only weakly consistent.
 */
export const roots: T.UIO<C.Chunk<Runtime<any, any>>> = T.succeed(() => C.from(_roots))
