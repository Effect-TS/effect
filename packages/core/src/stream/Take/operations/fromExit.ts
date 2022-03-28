import { Chunk } from "../../../collection/immutable/Chunk"
import { Option } from "../../../data/Option"
import type { Exit } from "../../../io/Exit"
import type { Take } from "../definition"
import { TakeInternal } from "./_internal/TakeInternal"

/**
 * Creates a `Take<E, A>` from `Exit<E, A>`.
 *
 * @tsplus static ets/TakeOps done
 */
export function fromExit<E, A>(exit: Exit<E, A>): Take<E, A> {
  return new TakeInternal(exit.mapBoth(Option.some, Chunk.single))
}
