/**
 * Returns a new channel, which is the same as this one, except the terminal
 * value of the returned channel is created by applying the specified function
 * to the terminal value of this channel.
 *
 * @tsplus fluent ets/Channel map
 */
export function map_<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone, OutDone2>(
  self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  f: (out: OutDone) => OutDone2
): Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone2> {
  return self.flatMap((z) => Channel.succeed(f(z)));
}

/**
 * Returns a new channel, which is the same as this one, except the terminal
 * value of the returned channel is created by applying the specified function
 * to the terminal value of this channel.
 *
 * @tsplus static ets/Channel/Aspects map
 */
export const map = Pipeable(map_);
