import type { Chunk } from "../../../collection/immutable/Chunk"
import { Channel } from "../../Channel"
import type { Sink } from "../definition"
import { SinkInternal } from "./_internal/SinkInternal"

/**
 * A sink that ignores its inputs.
 *
 * @tsplus static ets/SinkOps drain
 */
export function drain(
  __tsplusTrace?: string
): Sink<unknown, never, unknown, never, void> {
  const loop: Channel<
    unknown,
    never,
    Chunk<unknown>,
    unknown,
    never,
    Chunk<never>,
    void
  > = Channel.readWith(
    () => loop,
    (err) => Channel.fail(err),
    () => Channel.unit
  )
  return new SinkInternal(loop)
}
