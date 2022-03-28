import type { MergeTuple } from "../../../collection/immutable/Tuple"
import { Tuple } from "../../../collection/immutable/Tuple"
import type { LazyArg } from "../../../data/Function"
import type { Channel } from "../definition"

/**
 * Returns a new channel that is the sequential composition of this channel
 * and the specified channel. The returned channel terminates with a flattened
 * tuple of the terminal values of both channels.
 *
 * @tsplus operator ets/Channel +
 * @tsplus fluent ets/Channel zipFlatten
 */
export function zipFlatten_<
  Env,
  Env1,
  InErr,
  InErr1,
  InElem,
  InElem1,
  InDone,
  InDone1,
  OutErr,
  OutErr1,
  OutElem,
  OutElem1,
  OutDone,
  OutDone1
>(
  self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  that: LazyArg<Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, OutDone1>>
): Channel<
  Env & Env1,
  InErr & InErr1,
  InElem & InElem1,
  InDone & InDone1,
  OutErr | OutErr1,
  OutElem | OutElem1,
  MergeTuple<OutDone, OutDone1>
> {
  return self.flatMap((a) => that().map((b) => Tuple.mergeTuple(a, b)))
}

/**
 * Returns a new channel that is the sequential composition of this channel
 * and the specified channel. The returned channel terminates with a flattend
 * tuple of the terminal values of both channels.
 */
export const zipFlatten = Pipeable(zipFlatten_)
