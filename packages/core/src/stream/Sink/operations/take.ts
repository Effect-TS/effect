import { Chunk } from "../../../collection/immutable/Chunk"
import { Channel } from "../../Channel"
import { Sink } from "../definition"
import { SinkInternal } from "./_internal/SinkInternal"

/**
 * A sink that takes the specified number of values.
 *
 * @tsplus static ets/SinkOps take
 */
export function take<In>(
  n: number,
  __tsplusTrace?: string
): Sink<unknown, never, In, In, Chunk<In>> {
  return Sink.foldChunks<In, Chunk<In>>(
    Chunk.empty(),
    (chunk) => chunk.length < n,
    (acc, input) => acc + input
  ).flatMap((acc) => {
    const {
      tuple: [taken, leftover]
    } = acc.splitAt(n)
    return new SinkInternal(Channel.write(leftover) > Channel.succeedNow(taken))
  })
}
