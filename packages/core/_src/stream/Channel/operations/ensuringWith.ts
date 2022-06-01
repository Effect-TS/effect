import { Ensuring } from "@effect/core/stream/Channel/definition/primitives"

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
): Channel<Env | Env2, InErr, InElem, InDone, OutErr, OutElem, OutDone> {
  return new Ensuring<Env | Env2, InErr, InElem, InDone, OutErr, OutElem, OutDone>(
    channel,
    finalizer
  )
}

/**
 * Returns a new channel with an attached finalizer. The finalizer is
 * guaranteed to be executed so long as the channel begins execution (and
 * regardless of whether or not it completes).
 *
 * @tsplus static ets/Channel/Aspects ensuringWith
 */
export const ensuringWith = Pipeable(ensuringWith_)
