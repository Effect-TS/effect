/**
 * Returns a new channel that is the same as this one, except the terminal
 * value of the channel is the specified constant value.
 *
 * This method produces the same result as mapping this channel to the
 * specified constant value.
 *
 * @tsplus fluent ets/Channel as
 */
export function as_<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone, OutDone2>(
  self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  z2: LazyArg<OutDone2>
): Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone2> {
  return self.map(z2)
}

/**
 * Returns a new channel that is the same as this one, except the terminal
 * value of the channel is the specified constant value.
 *
 * This method produces the same result as mapping this channel to the
 * specified constant value.
 *
 * @tsplus static ets/Channel/Aspects as
 */
export const as = Pipeable(as_)
