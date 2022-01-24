import { empty } from "../../../collection/immutable/Chunk/core"
import * as O from "../../../data/Option"
import { never as effectNever } from "../../Effect/operations/never"
import { succeed } from "../../Effect/operations/succeed"
import { succeedNow } from "../../Effect/operations/succeedNow"
import { unit } from "../../Effect/operations/unit"
import * as FiberId from "../../FiberId"
import type { Fiber } from "../definition"
import { makeSynthetic } from "./makeSynthetic"

/**
 * A fiber that never fails or succeeds.
 */
export const never: Fiber<never, never> = makeSynthetic({
  id: FiberId.none,
  await: effectNever,
  children: succeedNow(empty()),
  inheritRefs: unit,
  poll: succeedNow(O.none),
  getRef: (ref) => succeed(() => ref.initial),
  interruptAs: () => effectNever
})
