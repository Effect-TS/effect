import { empty } from "../../../collection/immutable/Chunk/core"
import * as O from "../../../data/Option"
import { Effect } from "../../Effect"
import * as FiberId from "../../FiberId"
import type { Fiber } from "../definition"
import { makeSynthetic } from "./makeSynthetic"

/**
 * A fiber that never fails or succeeds.
 */
export const never: Fiber<never, never> = makeSynthetic({
  id: FiberId.none,
  await: Effect.never,
  children: Effect.succeedNow(empty()),
  inheritRefs: Effect.never,
  poll: Effect.succeedNow(O.none),
  getRef: (ref) => Effect.succeed(() => ref.initial),
  interruptAs: () => Effect.never
})
