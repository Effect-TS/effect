import { Chunk } from "../../../collection/immutable/Chunk"
import { Option } from "../../../data/Option"
import { Effect } from "../../Effect"
import type { Exit } from "../../Exit"
import { FiberId } from "../../FiberId"
import type { Fiber } from "../definition"
import { makeSynthetic } from "../definition"

/**
 * A fiber that is done with the specified `Exit` value.
 *
 * @tsplus static ets/FiberOps done
 */
export function done<E, A>(exit: Exit<E, A>): Fiber<E, A> {
  return makeSynthetic({
    id: FiberId.none,
    await: Effect.succeedNow(exit),
    children: Effect.succeedNow(Chunk.empty()),
    inheritRefs: Effect.unit,
    poll: Effect.succeedNow(Option.some(exit)),
    getRef: (ref) => Effect.succeed(() => ref.initialValue()),
    interruptAs: () => Effect.succeedNow(exit)
  })
}
