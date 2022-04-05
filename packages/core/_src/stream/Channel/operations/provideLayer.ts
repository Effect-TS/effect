/**
 * Provides a layer to the channel, which translates it to another level.
 *
 * @tsplus fluent ets/Channel provideLayer
 */
export function provideLayer_<
  Env0,
  Env,
  InErr,
  InElem,
  InDone,
  OutErr,
  OutErr2,
  OutElem,
  OutDone
>(
  self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  layer: LazyArg<Layer<Env0, OutErr2, Env>>,
  __tsplusTrace?: string
): Channel<Env0, InErr, InElem, InDone, OutErr | OutErr2, OutElem, OutDone> {
  return Channel.scoped(layer().build(), (env) => self.provideEnvironment(env));
}

/**
 * Provides a layer to the channel, which translates it to another level.
 *
 * @tsplus static ets/Channel/Aspects provideLayer
 */
export const provideLayer = Pipeable(provideLayer_);
