import { identity } from "../../../data/Function"
import type { Managed } from "../../../io/Managed"
import { Channel } from "../definition"

/**
 * Makes a channel from a managed that returns a channel in case of success.
 *
 * @tsplus static ets/ChannelOps unwrapManaged
 */
export function unwrapManaged<
  R,
  E,
  Env,
  InErr,
  InElem,
  InDone,
  OutErr,
  OutElem,
  OutDone
>(
  self: Managed<R, E, Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>>
): Channel<R & Env, InErr, InElem, InDone, E | OutErr, OutElem, OutDone> {
  return Channel.concatAllWith(Channel.managedOut(self), identity, identity)
}
