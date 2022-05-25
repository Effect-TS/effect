import { SinkInternal } from "@effect/core/stream/Sink/operations/_internal/SinkInternal"

/**
 * @tsplus static ets/Sink/Ops dropWhileEffect
 */
export function dropWhileEffect<R, E, In>(
  p: (input: In) => Effect<R, E, boolean>,
  __tsplusTrace?: string
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
        input
          .dropWhileEffect(p)
          .map((leftover) =>
            leftover.isEmpty()
              ? loop
              : Channel.write(leftover) > Channel.identity<E, Chunk<In>, unknown>()
          )
      ),
    (err) => Channel.fail(err),
    () => Channel.unit
  )
  return new SinkInternal(loop)
}
