import { Channel } from "../definition"

/**
 * Ignores the result of the effect replacing it with a void
 *
 * @tsplus fluent ets/Channel asUnit
 */
export function asUnit<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>(
  self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
): Channel<Env, InErr, InElem, InDone, OutErr, OutElem, void> {
  return self > Channel.unit
}
