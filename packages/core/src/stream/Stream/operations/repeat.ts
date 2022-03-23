import { Chunk } from "../../../collection/immutable/Chunk"
import type { LazyArg } from "../../../data/Function"
import { Channel } from "../../Channel"
import type { Stream } from "../definition"
import { StreamInternal } from "./_internal/StreamInternal"

/**
 * Repeats the provided value infinitely.
 *
 * @tsplus static ets/StreamOps repeat
 */
export function repeat<A>(
  a: LazyArg<A>,
  __tsplusTrace?: string
): Stream<unknown, never, A> {
  return new StreamInternal(
    Channel.succeed(a).flatMap((a) => Channel.write(Chunk.single(a)).repeated())
  )
}
