import * as Chunk from "@fp-ts/data/Chunk"

/**
 * A sink that collects first `n` elements into a chunk.
 *
 * @tsplus static effect/core/stream/Sink.Ops collectAllN
 * @category constructors
 * @since 1.0.0
 */
export function collectAllN<In>(n: number): Sink<never, never, In, In, Chunk.Chunk<In>> {
  return Sink.fromEffect(Effect.sync([] as Array<In>))
    .flatMap((cb) =>
      Sink.foldUntil<In, Array<In>>(cb, n, (builder, input) => {
        builder.push(input)
        return builder
      })
    ).map(Chunk.unsafeFromArray)
}
