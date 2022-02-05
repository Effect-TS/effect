// ets_tracing: off

import * as T from "../../../../Effect/index.js"
import type * as Ex from "../../../../Exit/index.js"
import { pipe } from "../../../../Function/index.js"
import * as Ref from "../../../../Ref/index.js"
import * as C from "../core.js"

export function acquireReleaseExitWith_<
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
  release: (a: Acquired, exit: Ex.Exit<OutErr, OutDone>) => T.RIO<Env, any>
): C.Channel<Env, InErr, InElem, InDone, OutErr, OutElem1, OutDone> {
  return pipe(
    C.fromEffect(
      Ref.makeRef<(exit: Ex.Exit<OutErr, OutDone>) => T.RIO<Env, any>>((_) => T.unit)
    ),
    C.chain((ref) =>
      pipe(
        C.fromEffect(
          T.uninterruptible(T.tap_(acquire, (a) => ref.set((_) => release(a, _))))
        ),
        C.chain(use),
        C.ensuringWith((ex) => T.chain_(ref.get, (_) => _(ex)))
      )
    )
  )
}

/**
 * @ets_data_first acquireReleaseExitWith_
 */
export function acquireReleaseExitWith<
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
  release: (a: Acquired, exit: Ex.Exit<OutErr, OutDone>) => T.RIO<Env, any>
) {
  return (acquire: T.Effect<Env, OutErr, Acquired>) =>
    acquireReleaseExitWith_(acquire, use, release)
}
