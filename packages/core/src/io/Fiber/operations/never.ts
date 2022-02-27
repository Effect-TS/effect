import { Chunk } from "../../../collection/immutable/Chunk"
import { Option } from "../../../data/Option"
import { Effect } from "../../Effect"
import { FiberId } from "../../FiberId"
import type { Runtime } from "../../FiberRef"
import type { Fiber } from "../definition"
import { makeSynthetic } from "../definition"

/**
 * A fiber that never fails or succeeds.
 *
 * @tsplus static ets/FiberOps never
 */
export const never: Fiber<never, never> = makeSynthetic({
  id: FiberId.none,
  await: Effect.never,
  children: Effect.succeedNow(Chunk.empty()),
  inheritRefs: Effect.never,
  poll: Effect.succeedNow(Option.none),
  getRef: (ref) => Effect.succeed(() => (ref as Runtime<any>).initial),
  interruptAs: () => Effect.never
})
