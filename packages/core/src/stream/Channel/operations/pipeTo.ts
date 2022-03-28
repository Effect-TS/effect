import type { LazyArg } from "../../../data/Function"
import type { Channel } from "../definition"
import { PipeTo } from "../definition"

/**
 * Pipe the output of a channel into the input of another.
 *
 * @tsplus operator ets/Channel >>
 * @tsplus fluent ets/Channel pipeTo
 */
export function pipeTo_<
  Env,
  Env2,
  InErr,
  InElem,
  InDone,
  OutErr,
  OutElem,
  OutDone,
  OutErr2,
  OutElem2,
  OutDone2
>(
  self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  that: LazyArg<Channel<Env2, OutErr, OutElem, OutDone, OutErr2, OutElem2, OutDone2>>
): Channel<Env & Env2, InErr, InElem, InDone, OutErr2, OutElem2, OutDone2> {
  return new PipeTo<
    Env & Env2,
    InErr,
    InElem,
    InDone,
    OutErr2,
    OutElem2,
    OutDone2,
    OutErr,
    OutElem,
    OutDone
  >(() => self, that)
}

/**
 * Pipe the output of a channel into the input of another.
 */
export const pipeTo = Pipeable(pipeTo_)
