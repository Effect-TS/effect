/**
 * Transforms the environment being provided to the channel with the specified
 * function.
 *
 * @tsplus fluent ets/Channel provideSomeEnvironment
 */
export function provideSomeEnvironment_<
  R0,
  R,
  InErr,
  InElem,
  InDone,
  OutErr,
  OutElem,
  OutDone
>(
  self: Channel<R, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  f: (env: Env<R0>) => Env<R>
): Channel<R0, InErr, InElem, InDone, OutErr, OutElem, OutDone> {
  return Channel.environmentWithChannel((env: Env<R0>) => self.provideEnvironment(f(env)));
}

/**
 * Transforms the environment being provided to the channel with the specified
 * function.
 *
 * @tsplus static ets/Channel/Aspects provideSomeEnvironment
 */
export const provideSomeEnvironment = Pipeable(provideSomeEnvironment_);
