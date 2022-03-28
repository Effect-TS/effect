import type { LazyArg } from "../../../data/Function"
import type { Channel } from "../definition"

/**
 * @tsplus fluent ets/Channel orDie
 */
export function orDie_<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone, E>(
  self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  error: LazyArg<E>
): Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone> {
  return self.orDieWith(error)
}

export const orDie = Pipeable(orDie_)
