// ets_tracing: off

import * as Tp from "../../../../Collections/Immutable/Tuple/index.js"
import * as T from "../../../../Effect/index.js"
import { pipe } from "../../../../Function/index.js"
import type * as M from "../../../../Managed/index.js"
import * as RM from "../../../../Managed/ReleaseMap/index.js"
import * as C from "../core.js"
import * as AcquireReleaseExitWith from "./acquireReleaseExitWith.js"

export function managed_<
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
  m: M.Managed<Env, OutErr, A>,
  use: (a: A) => C.Channel<Env1, InErr, InElem, InDone, OutErr1, OutElem, OutDone>
): C.Channel<Env & Env1, InErr, InElem, InDone, OutErr | OutErr1, OutElem, OutDone> {
  return AcquireReleaseExitWith.acquireReleaseExitWith_(
    RM.makeReleaseMap,
    (releaseMap) => {
      return pipe(
        C.fromEffect<Env, OutErr, A>(
          pipe(
            m.effect,
            T.provideSome((_: Env) => Tp.tuple(_, releaseMap)),
            T.map(Tp.get(1))
          )
        ),
        C.chain(use)
      )
    },
    (releaseMap, exit) => RM.releaseAll(exit, T.sequential)(releaseMap)
  )
}

/**
 * @ets_data_first managed_
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
>(use: (a: A) => C.Channel<Env1, InErr, InElem, InDone, OutErr1, OutElem, OutDone>) {
  return (m: M.Managed<Env, OutErr, A>) => managed_(m, use)
}
