import { SinkInternal } from "@effect/core/stream/Sink/operations/_internal/SinkInternal"

/**
 * A sink that executes the provided effectful function for every element fed
 * to it.
 *
 * @tsplus static effect/core/stream/Sink.Ops forEach
 */
export function forEach<R, E, In, Z>(
  f: (input: In) => Effect<R, E, Z>
): Sink<R, E, In, never, void> {
  const process: Channel<
    R,
    E,
    Chunk<In>,
    unknown,
    E,
    never,
    void
  > = Channel.readWithCause(
    (chunk: Chunk<In>) => Channel.fromEffect(Effect.forEachDiscard(chunk, f)) > process,
    (cause) => Channel.failCause(cause),
    () => Channel.unit
  )
  return new SinkInternal(process)
}
