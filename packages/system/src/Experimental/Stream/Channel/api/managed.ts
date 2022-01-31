// ets_tracing: off

import * as Tp from "../../../../Collections/Immutable/Tuple"
import * as T from "../../../../Effect"
import { pipe } from "../../../../Function"
import type * as M from "../../../../Managed"
import * as RM from "../../../../Managed/ReleaseMap"
import * as C from "../core.js"
import * as AcquireReleaseExitWith from "./acquireReleaseExitWith"

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
