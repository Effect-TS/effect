import type { Effect } from "../../../io/Effect"
import type { Exit } from "../../../io/Exit"
import type { Channel } from "../definition"
import { Ensuring } from "../definition"

/**
 * Returns a new channel with an attached finalizer. The finalizer is
 * guaranteed to be executed so long as the channel begins execution (and
 * regardless of whether or not it completes).
 *
 * @tsplus fluent ets/Channel ensuringWith
 */
export function ensuringWith_<
  Env,
  Env2,
  InErr,
  InElem,
  InDone,
  OutErr,
  OutElem,
  OutDone
>(
  channel: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  finalizer: (e: Exit<OutErr, OutDone>) => Effect<Env2, never, unknown>
): Channel<Env & Env2, InErr, InElem, InDone, OutErr, OutElem, OutDone> {
  return new Ensuring<Env & Env2, InErr, InElem, InDone, OutErr, OutElem, OutDone>(
    channel,
    finalizer
  )
}

/**
 * Returns a new channel with an attached finalizer. The finalizer is
 * guaranteed to be executed so long as the channel begins execution (and
 * regardless of whether or not it completes).
 */
export const ensuringWith = Pipeable(ensuringWith_)
