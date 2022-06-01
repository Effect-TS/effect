/**
 * Returns a new channel that will perform the operations of this one, until
 * failure, and then it will switch over to the operations of the specified
 * fallback channel.
 *
 * @tsplus operator ets/Channel |
 * @tsplus fluent ets/Channel orElse
 */
export function orElse_<
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
  OutDone1
>(
  self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  that: LazyArg<Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone1>>
): Channel<
  Env | Env1,
  InErr & InErr1,
  InElem & InElem1,
  InDone & InDone1,
  OutErr1,
  OutElem | OutElem1,
  OutDone | OutDone1
> {
  return self.catchAll(that)
}

/**
 * Returns a new channel that will perform the operations of this one, until
 * failure, and then it will switch over to the operations of the specified
 * fallback channel.
 *
 * @tsplus static ets/Channel/Aspects orElse
 */
export const orElse = Pipeable(orElse_)
