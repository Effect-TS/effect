import { SinkInternal } from "@effect/core/stream/Sink/operations/_internal/SinkInternal"

/**
 * @tsplus static ets/Sink/Ops leftover
 */
export function leftover<L>(
  chunk: LazyArg<Chunk<L>>,
  __tsplusTrace?: string
): Sink<never, never, unknown, L, void> {
  return new SinkInternal(Channel.suspend(Channel.write(chunk())))
}
