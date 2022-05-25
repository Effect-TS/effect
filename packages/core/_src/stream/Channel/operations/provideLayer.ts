/**
 * Provides a layer to the channel, which translates it to another level.
 *
 * @tsplus fluent ets/Channel provideLayer
 */
export function provideLayer_<
  R0,
  R,
  InErr,
  InElem,
  InDone,
  OutErr,
  OutErr2,
  OutElem,
  OutDone
>(
  self: Channel<R, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  layer: LazyArg<Layer<R0, OutErr2, R>>,
  __tsplusTrace?: string
): Channel<R0, InErr, InElem, InDone, OutErr | OutErr2, OutElem, OutDone> {
  return Channel.unwrapScoped(layer().build().map((env) => self.provideEnvironment(env)))
}

/**
 * Provides a layer to the channel, which translates it to another level.
 *
 * @tsplus static ets/Channel/Aspects provideLayer
 */
export const provideLayer = Pipeable(provideLayer_)
