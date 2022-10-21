import { SinkInternal } from "@effect/core/stream/Sink/operations/_internal/SinkInternal"

/**
 * A sink that executes the provided effectful function for every chunk fed to
 * it.
 *
 * @tsplus static effect/core/stream/Sink.Ops forEachChunk
 */
export function forEachChunk<R, E, In, Z>(
  f: (input: Chunk<In>) => Effect<R, E, Z>
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
    (chunk: Chunk<In>) => Channel.fromEffect(f(chunk)).flatMap(() => process),
    (cause) => Channel.failCause(cause),
    () => Channel.unit
  )
  return new SinkInternal(process)
}
