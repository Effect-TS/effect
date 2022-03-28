import type { Chunk } from "../../../collection/immutable/Chunk"
import type { Predicate } from "../../../data/Function"
import { Channel } from "../../Channel"
import type { Sink } from "../definition"
import { SinkInternal } from "./_internal/SinkInternal"

/**
 * @tsplus static ets/SinkOps dropWhile
 */
export function dropWhile<In>(
  p: Predicate<In>,
  __tsplusTrace?: string
): Sink<unknown, never, In, In, unknown> {
  const loop: Channel<
    unknown,
    never,
    Chunk<In>,
    unknown,
    never,
    Chunk<In>,
    unknown
  > = Channel.readWith(
    (chunk: Chunk<In>) => {
      const leftover = chunk.dropWhile(p)
      const more = leftover.isEmpty()
      return more
        ? loop
        : Channel.write(leftover) > Channel.identity<never, Chunk<In>, unknown>()
    },
    (err) => Channel.fail(err),
    () => Channel.unit
  )
  return new SinkInternal(loop)
}
