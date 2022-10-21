/**
 * Returns a new channel, which is the same as this one, except the failure
 * value of the returned channel is created by applying the specified function
 * to the failure value of this channel.
 *
 * @tsplus static effect/core/stream/Channel.Aspects mapError
 * @tsplus pipeable effect/core/stream/Channel mapError
 */
export function mapError<OutErr, OutErr2>(f: (err: OutErr) => OutErr2) {
  return <Env, InErr, InElem, InDone, OutElem, OutDone>(
    self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  ): Channel<Env, InErr, InElem, InDone, OutErr2, OutElem, OutDone> =>
    self.mapErrorCause((cause) => cause.map(f))
}
