/**
 * Returns a new channel, which is the same as this one, except the terminal
 * value of the returned channel is created by applying the specified
 * effectful function to the terminal value of this channel.
 *
 * @tsplus static effect/core/stream/Channel.Aspects mapEffect
 * @tsplus pipeable effect/core/stream/Channel mapEffect
 * @category mapping
 * @since 1.0.0
 */
export function mapEffect<
  Env1,
  OutErr1,
  OutDone,
  OutDone1
>(f: (o: OutDone) => Effect<Env1, OutErr1, OutDone1>) {
  return <Env, InErr, InElem, InDone, OutErr, OutElem>(
    self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  ): Channel<Env | Env1, InErr, InElem, InDone, OutErr | OutErr1, OutElem, OutDone1> =>
    self.flatMap((z) => Channel.fromEffect(f(z)))
}
