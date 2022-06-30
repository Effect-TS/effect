import { concreteStream, StreamInternal } from "@effect/core/stream/Stream/operations/_internal/StreamInternal"

/**
 * Provides a layer to the stream, which translates it to another level.
 *
 * @tsplus static effect/core/stream/Stream.Aspects provideLayer
 * @tsplus pipeable effect/core/stream/Stream provideLayer
 */
export function provideLayer<R, E, A>(
  layer: LazyArg<Layer<R, E, A>>,
  __tsplusTrace?: string
) {
  return <E1, A1>(self: Stream<A, E1, A1>): Stream<R, E | E1, A1> => {
    concreteStream(self)
    return new StreamInternal(
      Channel.unwrapScoped(layer().build.map((env) => self.channel.provideEnvironment(env)))
    )
  }
}
