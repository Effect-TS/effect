import { SinkInternal } from "@effect/core/stream/Sink/operations/_internal/SinkInternal"

/**
 * @tsplus static effect/core/stream/Sink.Ops dropWhileEffect
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
            leftover.isEmpty
              ? loop
              : Channel.write(leftover) > Channel.identity<E, Chunk<In>, unknown>()
          )
      ),
    (err) => Channel.failSync(err),
    () => Channel.unit
  )
  return new SinkInternal(loop)
}
