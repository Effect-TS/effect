import { SinkInternal } from "@effect/core/stream/Sink/operations/_internal/SinkInternal"
import type { Chunk } from "@fp-ts/data/Chunk"

/**
 * A sink that executes the provided effectful function for every chunk fed to
 * it until `f` evaluates to `false`.
 *
 * @tsplus static effect/core/stream/Sink.Ops forEachChunkWhile
 * @category traversing
 * @since 1.0.0
 */
export function forEachChunkWhile<R, E, In>(
  f: (input: Chunk<In>) => Effect<R, E, boolean>
): Sink<R, E, In, In, void> {
  const reader: Channel<
    R,
    E,
    Chunk<In>,
    unknown,
    E,
    Chunk<In>,
    void
  > = Channel.readWith(
    (input: Chunk<In>) =>
      Channel.fromEffect(f(input)).flatMap((cont) => (cont ? reader : Channel.unit)),
    (err) => Channel.fail(err),
    () => Channel.unit
  )
  return new SinkInternal(reader)
}
