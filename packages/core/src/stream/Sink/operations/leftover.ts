import type { Chunk } from "../../../collection/immutable/Chunk"
import type { LazyArg } from "../../../data/Function"
import { Channel } from "../../Channel"
import type { Sink } from "../definition"
import { SinkInternal } from "./_internal/SinkInternal"

/**
 * @tsplus static ets/SinkOps leftover
 */
export function leftover<L>(
  chunk: LazyArg<Chunk<L>>,
  __tsplusTrace?: string
): Sink<unknown, never, unknown, L, void> {
  return new SinkInternal(Channel.suspend(Channel.write(chunk())))
}
