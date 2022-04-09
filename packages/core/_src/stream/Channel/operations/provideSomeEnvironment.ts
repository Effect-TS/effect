/**
 * Transforms the environment being provided to the channel with the specified
 * function.
 *
 * @tsplus fluent ets/Channel provideSomeEnvironment
 */
export function provideSomeEnvironment_<
  Env0,
  Env,
  InErr,
  InElem,
  InDone,
  OutErr,
  OutElem,
  OutDone
>(
  self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  f: (env0: Env0) => Env
): Channel<Env0, InErr, InElem, InDone, OutErr, OutElem, OutDone> {
  return Channel.environmentWithChannel((env: Env0) => self.provideEnvironment(f(env)));
}

/**
 * Transforms the environment being provided to the channel with the specified
 * function.
 *
 * @tsplus static ets/Channel/Aspects provideSomeEnvironment
 */
export const provideSomeEnvironment = Pipeable(provideSomeEnvironment_);
