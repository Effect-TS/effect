/**
 * Returns a new channel, which is the same as this one, except the failure
 * value of the returned channel is created by applying the specified function
 * to the failure value of this channel.
 *
 * @tsplus fluent ets/Channel mapError
 */
export function mapError_<
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
  f: (err: OutErr) => OutErr2
): Channel<Env, InErr, InElem, InDone, OutErr2, OutElem, OutDone> {
  return self.mapErrorCause((cause) => cause.map(f))
}

/**
 * Returns a new channel, which is the same as this one, except the failure
 * value of the returned channel is created by applying the specified function
 * to the failure value of this channel.
 *
 * @tsplus static ets/Channel/Aspects mapError
 */
export const mapError = Pipeable(mapError_)
