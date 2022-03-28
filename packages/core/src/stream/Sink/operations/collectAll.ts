import { Chunk } from "../../../collection/immutable/Chunk"
import { Channel } from "../../Channel"
import type { Sink } from "../definition"
import { SinkInternal } from "./_internal/SinkInternal"

/**
 * @tsplus static ets/SinkOps collectAll
 */
export function collectAll<In>(
  __tsplusTrace?: string
): Sink<unknown, never, In, never, Chunk<In>> {
  return new SinkInternal(loop(Chunk.empty()))
}

function loop<In>(
  acc: Chunk<In>
): Channel<unknown, never, Chunk<In>, unknown, never, never, Chunk<In>> {
  return Channel.readWithCause(
    (chunk: Chunk<In>) => loop<In>(acc + chunk),
    (cause) => Channel.failCause(cause),
    () => Channel.succeed(acc)
  )
}
