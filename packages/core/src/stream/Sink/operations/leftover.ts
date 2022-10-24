import { SinkInternal } from "@effect/core/stream/Sink/operations/_internal/SinkInternal"
import type { Chunk } from "@fp-ts/data/Chunk"

/**
 * @tsplus static effect/core/stream/Sink.Ops leftover
 * @category constructors
 * @since 1.0.0
 */
export function leftover<L>(chunk: Chunk<L>): Sink<never, never, unknown, L, void> {
  return new SinkInternal(Channel.suspend(Channel.write(chunk)))
}
