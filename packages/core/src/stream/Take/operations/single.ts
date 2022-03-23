import { Chunk } from "../../../collection/immutable/Chunk"
import { Exit } from "../../../io/Exit"
import type { Take } from "../definition"
import { TakeInternal } from "./_internal/TakeInternal"

/**
 * Creates a `Take<never, A>` with a singleton chunk.
 *
 * @tsplus static ets/TakeOps single
 */
export function single<A>(a: A): Take<never, A> {
  return new TakeInternal(Exit.succeed(Chunk.single(a)))
}
