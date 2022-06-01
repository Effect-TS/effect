/**
 * Splits the environment into two parts, providing one part using the
 * specified layer and leaving the remainder `Env0`.
 *
 * @tsplus fluent ets/Channel provideSomeLayer
 */
export function provideSomeLayer_<
  R0 extends Spreadable,
  R extends Spreadable,
  R2 extends Spreadable,
  InErr,
  InElem,
  InDone,
  OutErr,
  OutErr2,
  OutElem,
  OutDone
>(
  self: Channel<R, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  layer: LazyArg<Layer<R0, OutErr2, R2>>
): Channel<R0 | Exclude<R, R2>, InErr, InElem, InDone, OutErr | OutErr2, OutElem, OutDone> {
  return self.provideLayer(Layer.environment<R0>() + layer())
}

/**
 * @tsplus static ets/Channel/Aspects provideSomeLayer
 */
export const provideSomeLayer = Pipeable(provideSomeLayer_)
