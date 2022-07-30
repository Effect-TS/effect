/**
 * Splits the environment into two parts, providing one part using the
 * specified layer and leaving the remainder `Env0`.
 *
 * @tsplus static effect/core/stream/Channel.Aspects provideSomeLayer
 * @tsplus pipeable effect/core/stream/Channel provideSomeLayer
 */
export function provideSomeLayer<R0, R2, OutErr2>(
  layer: LazyArg<Layer<R0, OutErr2, R2>>
) {
  return <R, InErr, InElem, InDone, OutErr, OutElem, OutDone>(
    self: Channel<R, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  ): Channel<R0 | Exclude<R, R2>, InErr, InElem, InDone, OutErr | OutErr2, OutElem, OutDone> =>
    // @ts-expect-error
    self.provideLayer(Layer.environment<Exclude<R, R2>>().merge(layer()))
}
