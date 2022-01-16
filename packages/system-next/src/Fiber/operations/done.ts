// ets_tracing: off

import * as Chunk from "../../Collections/Immutable/Chunk"
import { succeed } from "../../Effect/operations/succeed"
import { succeedNow } from "../../Effect/operations/succeedNow"
import { unit } from "../../Effect/operations/unit"
import type { Exit } from "../../Exit"
import * as FiberId from "../../FiberId"
import * as O from "../../Option"
import type { Fiber } from "../definition"
import { makeSynthetic } from "./makeSynthetic"

/**
 * A fiber that is done with the specified `Exit` value.
 */
export function done<E, A>(exit: Exit<E, A>): Fiber<E, A> {
  return makeSynthetic({
    id: FiberId.none,
    await: succeedNow(exit),
    children: succeedNow(Chunk.empty()),
    inheritRefs: unit,
    poll: succeedNow(O.some(exit)),
    getRef: (ref) => succeed(() => ref.initial),
    interruptAs: () => succeedNow(exit)
  })
}
