import { SinkInternal } from "@effect/core/stream/Sink/operations/_internal/SinkInternal"

/**
 * @tsplus static effect/core/stream/Sink.Ops leftover
 */
export function leftover<L>(chunk: Chunk<L>): Sink<never, never, unknown, L, void> {
  return new SinkInternal(Channel.suspend(Channel.write(chunk)))
}
