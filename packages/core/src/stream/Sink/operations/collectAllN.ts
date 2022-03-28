import type { ChunkBuilder } from "../../../collection/immutable/Chunk"
import { Chunk } from "../../../collection/immutable/Chunk"
import { Effect } from "../../../io/Effect"
import { Sink } from "../definition"

/**
 * A sink that collects first `n` elements into a chunk.
 *
 * @tsplus static ets/SinkOps collectAllN
 */
export function collectAllN<In>(
  n: number,
  __tsplusTrace?: string
): Sink<unknown, never, In, In, Chunk<In>> {
  return Sink.fromEffect(Effect.succeed(Chunk.builder<In>()))
    .flatMap((cb) =>
      Sink.foldUntil<In, ChunkBuilder<In>>(cb, n, (builder, input) =>
        builder.append(input)
      )
    )
    .map((builder) => builder.build())
}
