import { SinkInternal } from "@effect-ts/core/stream/Sink/operations/_internal/SinkInternal";

/**
 * A sink that executes the provided effectful function for every chunk fed to
 * it until `f` evaluates to `false`.
 *
 * @tsplus static ets/Sink/Ops forEachChunkWhile
 */
export function forEachChunkWhile<R, E, In>(
  f: (input: Chunk<In>) => Effect<R, E, boolean>,
  __tsplusTrace?: string
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
    (input: Chunk<In>) => Channel.fromEffect(f(input)).flatMap((cont) => (cont ? reader : Channel.unit)),
    (err) => Channel.fail(err),
    () => Channel.unit
  );
  return new SinkInternal(reader);
}
