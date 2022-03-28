import type { Chunk } from "../../../collection/immutable/Chunk"
import { Exit } from "../../../io/Exit"
import type { Take } from "../definition"
import { TakeInternal } from "./_internal/TakeInternal"

/**
 * Creates a `Take<never, A>` with the specified chunk.
 *
 * @tsplus static ets/TakeOps chunk
 */
export function chunk<A>(chunk: Chunk<A>): Take<never, A> {
  return new TakeInternal(Exit.succeed(chunk))
}
