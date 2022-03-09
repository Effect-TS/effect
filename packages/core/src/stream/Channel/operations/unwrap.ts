import type { LazyArg } from "../../../data/Function"
import type { Effect } from "../../../io/Effect"
import { Channel } from "../definition"

/**
 * Makes a channel from an effect that returns a channel in case of success.
 *
 * @tsplus static ets/ChannelOps unwrap
 */
export function unwrap<R, E, Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>(
  channel: LazyArg<
    Effect<R, E, Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>>
  >
): Channel<R & Env, InErr, InElem, InDone, E | OutErr, OutElem, OutDone> {
  return Channel.fromEffect(channel).flatten()
}
