/**
 * Returns a new channel, which is the same as this one, except the terminal
 * value of the returned channel is created by applying the specified function
 * to the terminal value of this channel.
 *
 * @tsplus static effect/core/stream/Channel.Aspects map
 * @tsplus pipeable effect/core/stream/Channel map
 */
export function map<OutDone, OutDone2>(f: (out: OutDone) => OutDone2) {
  return <Env, InErr, InElem, InDone, OutErr, OutElem>(
    self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  ): Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone2> =>
    self.flatMap(
      (z) => Channel.succeed(f(z))
    )
}
