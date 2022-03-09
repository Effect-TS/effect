import type { RIO } from "../../../io/Effect"
import type { Channel } from "../definition"

/**
 * @tsplus fluent ets/Channel ensuring
 */
export function ensuring_<
  Env,
  Env1,
  InErr,
  InElem,
  InDone,
  OutErr,
  OutElem,
  OutDone,
  Z
>(
  self: Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  finalizer: RIO<Env1, Z>
): Channel<Env & Env1, InErr, InElem, InDone, OutErr, OutElem, OutDone> {
  return self.ensuringWith(() => finalizer)
}

export const ensuring = Pipeable(ensuring_)
