import type { LazyArg } from "../../../data/Function"
import { ExecutionStrategy } from "../../../io/ExecutionStrategy"
import { Managed } from "../../../io/Managed"
import { ReleaseMap } from "../../../io/Managed/ReleaseMap"
import { Channel } from "../definition"

/**
 * @tsplus static ets/ChannelOps managed
 */
export function managed<
  Env,
  Env1,
  InErr,
  InElem,
  InDone,
  OutErr,
  OutErr1,
  OutElem,
  OutDone,
  A
>(
  managed: LazyArg<Managed<Env, OutErr, A>>,
  use: (a: A) => Channel<Env1, InErr, InElem, InDone, OutErr1, OutElem, OutDone>
): Channel<Env & Env1, InErr, InElem, InDone, OutErr | OutErr1, OutElem, OutDone> {
  return Channel.acquireReleaseExitWith(
    ReleaseMap.make,
    (releaseMap) =>
      Channel.fromEffect<Env, OutErr, A>(
        managed()
          .effect.apply(Managed.currentReleaseMap.value.locally(releaseMap))
          .map((tuple) => tuple.get(1))
      ).flatMap(use),
    (releaseMap, exit) => releaseMap.releaseAll(exit, ExecutionStrategy.Sequential)
  )
}
