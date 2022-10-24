import { SinkInternal } from "@effect/core/stream/Sink/operations/_internal/SinkInternal"
import type { Chunk } from "@fp-ts/data/Chunk"

/**
 * @tsplus static effect/core/stream/Sink.Ops dropWhileEffect
 * @category constructors
 * @since 1.0.0
 */
export function dropWhileEffect<R, E, In>(
  p: (input: In) => Effect<R, E, boolean>
): Sink<R, E, In, In, unknown> {
  const loop: Channel<
    R,
    E,
    Chunk<In>,
    unknown,
    E,
    Chunk<In>,
    unknown
  > = Channel.readWith(
    (input: Chunk<In>) =>
      Channel.unwrap(
        Effect.dropWhile(input, p)
          .map((leftover) =>
            leftover.length === 0
              ? loop
              : Channel.write(leftover).flatMap(() => Channel.identity<E, Chunk<In>, unknown>())
          )
      ),
    (err) => Channel.fail(err),
    () => Channel.unit
  )
  return new SinkInternal(loop)
}
