/**
 * Returns a new channel, which is the same as this one, except it will be
 * interrupted when the specified deferred is completed. If the deferred is
 * completed before the underlying channel is done, then the returned channel
 * will yield the value of the deferred. Otherwise, if the underlying channel
 * finishes first, then the returned channel will yield the value of the
 * underlying channel.
 *
 * @tsplus static effect/core/stream/Channel.Aspects interruptWhenDeferred
 * @tsplus pipeable effect/core/stream/Channel interruptWhenDeferred
 * @category interruption
 * @since 1.0.0
 */
export function interruptWhenDeferred<
  OutErr1,
  OutDone1
>(deferred: Deferred<OutErr1, OutDone1>) {
  return <Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>(
    self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  ): Channel<Env, InErr, InElem, InDone, OutErr | OutErr1, OutElem, OutDone | OutDone1> =>
    self.interruptWhen(deferred.await)
}
