/**
 * Provides a layer to the channel, which translates it to another level.
 *
 * @tsplus static effect/core/stream/Channel.Aspects provideLayer
 * @tsplus pipeable effect/core/stream/Channel provideLayer
 * @category environment
 * @since 1.0.0
 */
export function provideLayer<R0, R, OutErr2>(layer: Layer<R0, OutErr2, R>) {
  return <InErr, InElem, InDone, OutErr, OutElem, OutDone>(
    self: Channel<R, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  ): Channel<R0, InErr, InElem, InDone, OutErr | OutErr2, OutElem, OutDone> =>
    Channel.unwrapScoped(layer.build.map((env) => self.provideEnvironment(env)))
}
