/**
 * Returns a new channel that is the sequential composition of this channel
 * and the specified channel. The returned channel terminates with the result
 * of calling the specified function on the terminal values of both channels.
 *
 * @tsplus fluent ets/Channel zipWith
 */
export function zipWith_<
  Env,
  Env1,
  InErr,
  InErr1,
  InElem,
  InElem1,
  InDone,
  InDone1,
  OutErr,
  OutErr1,
  OutElem,
  OutElem1,
  OutDone,
  OutDone1,
  OutDone2
>(
  self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  that: LazyArg<Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone1>>,
  f: (outDone: OutDone, outDone1: OutDone1) => OutDone2
): Channel<
  Env & Env1,
  InErr & InErr1,
  InElem & InElem1,
  InDone & InDone1,
  OutErr | OutErr1,
  OutElem | OutElem1,
  OutDone2
> {
  return self.flatMap((a) => that().map((b) => f(a, b)))
}

/**
 * Returns a new channel that is the sequential composition of this channel
 * and the specified channel. The returned channel terminates with the result
 * of calling the specified function on the terminal values of both channels.
 *
 * @tsplus static ets/Channel/Aspects zipWith
 */
export const zipWith = Pipeable(zipWith_)
