import { concreteSink, SinkInternal } from "@effect/core/stream/Sink/operations/_internal/SinkInternal";

/**
 * Transforms this sink's input chunks. `f` must preserve chunking-invariance.
 *
 * @tsplus fluent ets/Sink contramapChunks
 */
export function contramapChunks_<R, E, In, In1, L, Z>(
  self: Sink<R, E, In, L, Z>,
  f: (input: Chunk<In1>) => Chunk<In>,
  __tsplusTrace?: string
): Sink<R, E, In1, L, Z> {
  const loop: Channel<
    R,
    never,
    Chunk<In1>,
    unknown,
    never,
    Chunk<In>,
    unknown
  > = Channel.readWith(
    (chunk: Chunk<In1>) => Channel.write(f(chunk)) > loop,
    (err) => Channel.fail(err),
    (done) => Channel.succeed(done)
  );
  concreteSink(self);
  return new SinkInternal(loop >> self.channel);
}

/**
 * Transforms this sink's input chunks. `f` must preserve chunking-invariance.
 *
 * @tsplus static ets/Sink/Aspects contramapChunks
 */
export const contramapChunks = Pipeable(contramapChunks_);
