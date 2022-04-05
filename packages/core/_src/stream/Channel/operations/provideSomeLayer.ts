/**
 * Splits the environment into two parts, providing one part using the
 * specified layer and leaving the remainder `Env0`.
 *
 * @tsplus fluent ets/Channel provideSomeLayer
 */
export function provideSomeLayer_<
  Env0,
  Env,
  Env2,
  InErr,
  InElem,
  InDone,
  OutErr,
  OutErr2,
  OutElem,
  OutDone
>(
  self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  layer: LazyArg<Layer<Env0, OutErr2, Env2>>
): Channel<Env0 & Erase<Env, Env2>, InErr, InElem, InDone, OutErr, OutElem, OutDone> {
  // @ts-expect-error
  return self.provideLayer(Layer.environment<Env0>() + layer());
}

/**
 * @tsplus static ets/Channel/Aspects provideSomeLayer
 */
export const provideSomeLayer = Pipeable(provideSomeLayer_);
