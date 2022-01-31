// ets_tracing: off

import type * as T from "../../../../Effect/index.js"
import type * as C from "../core.js"
import * as AcquireReleaseExitWith from "./acquireReleaseExitWith.js"

export function acquireReleaseWith_<
  Env,
  InErr,
  InElem,
  InDone,
  OutErr,
  OutElem1,
  OutDone,
  Acquired
>(
  acquire: T.Effect<Env, OutErr, Acquired>,
  use: (
    a: Acquired
  ) => C.Channel<Env, InErr, InElem, InDone, OutErr, OutElem1, OutDone>,
  release: (a: Acquired) => T.RIO<Env, any>
): C.Channel<Env, InErr, InElem, InDone, OutErr, OutElem1, OutDone> {
  return AcquireReleaseExitWith.acquireReleaseExitWith_(acquire, use, (a, _) =>
    release(a)
  )
}

/**
 * @ets_data_first acquireReleaseWith_
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
  use: (
    a: Acquired
  ) => C.Channel<Env, InErr, InElem, InDone, OutErr, OutElem1, OutDone>,
  release: (a: Acquired) => T.RIO<Env, any>
) {
  return (acquire: T.Effect<Env, OutErr, Acquired>) =>
    acquireReleaseWith_(acquire, use, release)
}
