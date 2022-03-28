import type { Effect, RIO } from "../../../io/Effect"
import { Channel } from "../definition"

/**
 * @tsplus static ets/ChannelOps acquireReleaseWith
 */
export function acquireReleaseWith<
  Env,
  InErr,
  InElem,
  InDone,
  OutErr,
  OutElem1,
  OutDone,
  Acquired
>(
  acquire: Effect<Env, OutErr, Acquired>,
  use: (a: Acquired) => Channel<Env, InErr, InElem, InDone, OutErr, OutElem1, OutDone>,
  release: (a: Acquired) => RIO<Env, any>
): Channel<Env, InErr, InElem, InDone, OutErr, OutElem1, OutDone> {
  return Channel.acquireReleaseExitWith(acquire, use, (a, _) => release(a))
}
