import { Chunk } from "../../../collection/immutable/Chunk"
import type { UIO } from "../../Effect"
import { Effect } from "../../Effect"
import { FiberScope } from "../../FiberScope"
import type { Fiber } from "../definition"

/**
 * Returns a chunk containing all root fibers. Due to concurrency, the
 * returned chunk is only weakly consistent.
 *
 * @tsplus static ets/FiberOps roots
 */
export const roots: UIO<Chunk<Fiber.Runtime<any, any>>> = Effect.succeed(() =>
  Chunk.from(FiberScope._roots.value)
)
