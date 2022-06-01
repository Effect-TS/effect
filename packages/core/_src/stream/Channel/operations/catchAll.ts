/**
 * Returns a new channel that is the same as this one, except if this channel
 * errors for any typed error, then the returned channel will switch over to
 * using the fallback channel returned by the specified error handler.
 *
 * @tsplus fluent ets/Channel catchAll
 */
export function catchAll_<
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
  f: (
    error: OutErr
  ) => Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone1>
): Channel<
  Env | Env1,
  InErr & InErr1,
  InElem & InElem1,
  InDone & InDone1,
  OutErr1,
  OutElem | OutElem1,
  OutDone | OutDone1
> {
  return self.catchAllCause((cause) =>
    cause.failureOrCause().fold(
      (outErr) => f(outErr),
      (cause) => Channel.failCause(cause)
    )
  )
}

/**
 * Returns a new channel that is the same as this one, except if this channel
 * errors for any typed error, then the returned channel will switch over to
 * using the fallback channel returned by the specified error handler.
 *
 * @tsplus static ets/Channel/Aspects catchAll
 */
export const catchAll = Pipeable(catchAll_)
