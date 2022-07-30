/**
 * Splits the environment into two parts, providing one part using the
 * specified layer and leaving the remainder.
 *
 * @tsplus static effect/core/stream/Stream.Aspects provideSomeLayer
 * @tsplus pipeable effect/core/stream/Stream provideSomeLayer
 */
export function provideSomeLayer<R, E, A, R1, E1, A1>(
  layer: LazyArg<Layer<R1, E1, A1>>,
  __tsplusTrace?: string
) {
  return <R, E, A>(self: Stream<R, E, A>): Stream<R1 | Exclude<R, A1>, E | E1, A> =>
    (self as Stream<R1 | A1, E, A>).provideLayer(Layer.environment<R1>().merge(layer()))
}
