import type { ChunkBuilder } from "@tsplus/stdlib/collections/Chunk"

/**
 * A sink that collects first `n` elements into a chunk.
 *
 * @tsplus static effect/core/stream/Sink.Ops collectAllN
 */
export function collectAllN<In>(n: number): Sink<never, never, In, In, Chunk<In>> {
  return Sink.fromEffect(Effect.sync(Chunk.builder<In>()))
    .flatMap((cb) =>
      Sink.foldUntil<In, ChunkBuilder<In>>(cb, n, (builder, input) => builder.append(input))
    )
    .map((builder) => builder.build())
}
