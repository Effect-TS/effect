import type { LazyArg } from "../../../data/Function"
import type { Effect } from "../../../io/Effect"
import type { HasScope } from "../../../io/Scope"
import { Scope } from "../../../io/Scope"
import { Channel } from "../definition"

/**
 * @tsplus static ets/ChannelOps scoped
 */
export function scoped<
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
  effect: LazyArg<Effect<Env & HasScope, OutErr, A>>,
  use: (a: A) => Channel<Env1, InErr, InElem, InDone, OutErr1, OutElem, OutDone>
): Channel<Env & Env1, InErr, InElem, InDone, OutErr | OutErr1, OutElem, OutDone> {
  return Channel.acquireReleaseExitWith(
    Scope.make,
    (scope) => Channel.fromEffect<Env, OutErr, A>(scope.extend(effect)).flatMap(use),
    (scope, exit) => scope.close(exit)
  )
}
