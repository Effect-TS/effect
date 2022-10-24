import { SinkInternal } from "@effect/core/stream/Sink/operations/_internal/SinkInternal"
import type { Chunk } from "@fp-ts/data/Chunk"

/**
 * A sink that ignores its inputs.
 *
 * @tsplus static effect/core/stream/Sink.Ops drain
 * @category constructors
 * @since 1.0.0
 */
export function drain(): Sink<never, never, unknown, never, void> {
  const loop: Channel<
    never,
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
