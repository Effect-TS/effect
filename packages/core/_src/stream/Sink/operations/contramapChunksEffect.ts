import { concreteSink, SinkInternal } from "@effect-ts/core/stream/Sink/operations/_internal/SinkInternal";

/**
 * Effectfully transforms this sink's input chunks. `f` must preserve
 * chunking-invariance.
 *
 * @tsplus fluent ets/Sink contramapChunksEffect
 */
export function contramapChunksEffect_<R, E, R2, E2, In, In1, L, Z>(
  self: Sink<R, E, In, L, Z>,
  f: (input: Chunk<In1>) => Effect<R2, E2, Chunk<In>>,
  __tsplusTrace?: string
): Sink<R & R2, E | E2, In1, L, Z> {
  const loop: Channel<
    R & R2,
    never,
    Chunk<In1>,
    unknown,
    E | E2,
    Chunk<In>,
    unknown
  > = Channel.readWith(
    (chunk: Chunk<In1>) => Channel.fromEffect(f(chunk)).flatMap((chunk) => Channel.write(chunk)) > loop,
    (err) => Channel.fail(err),
    (done) => Channel.succeed(done)
  );
  concreteSink(self);
  return new SinkInternal(loop.pipeToOrFail(self.channel));
}

/**
 * Effectfully transforms this sink's input chunks. `f` must preserve
 * chunking-invariance.
 *
 * @tsplus static ets/Sink/Aspects contramapChunksEffect
 */
export const contramapChunksEffect = Pipeable(contramapChunksEffect_);
