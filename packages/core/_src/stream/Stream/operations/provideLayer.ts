import { concreteStream, StreamInternal } from "@effect-ts/core/stream/Stream/operations/_internal/StreamInternal";

/**
 * Provides a layer to the stream, which translates it to another level.
 *
 * @tsplus fluent ets/Stream provideLayer
 */
export function provideLayer_<R, E, A, E1, A1>(
  self: Stream<A, E1, A1>,
  layer: LazyArg<Layer<R, E, A>>,
  __tsplusTrace?: string
): Stream<R, E | E1, A1> {
  concreteStream(self);
  return new StreamInternal(
    Channel.scoped(layer().build(), (r) => self.channel.provideEnvironment(r))
  );
}

/**
 * Provides a layer to the stream, which translates it to another level.
 *
 * @tsplus static ets/Stream/Aspects provideLayer
 */
export const provideLayer = Pipeable(provideLayer_);
