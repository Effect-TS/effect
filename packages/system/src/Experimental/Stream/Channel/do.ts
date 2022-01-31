// ets_tracing: off

import * as T from "../../../Effect/index.js"
import { pipe } from "../../../Function/index.js"
import * as Api from "./api/index.js"
import * as Core from "./core.js"

function bind<
  Env,
  InErr,
  InElem,
  InDone,
  OutErr,
  OutElem,
  OutDone,
  K,
  N extends string
>(
  tag: Exclude<N, keyof K>,
  f: (_: K) => Core.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
) {
  return <Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1>(
    mk: Core.Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, K>
  ): Core.Channel<
    Env & Env1,
    InErr & InErr1,
    InElem & InElem1,
    InDone & InDone1,
    OutErr | OutErr1,
    OutElem | OutElem1,
    K & { [k in N]: OutDone }
  > =>
    pipe(
      mk,
      Core.chain((k) =>
        pipe(
          f(k),
          Api.map((a): K & { [k in N]: OutDone } => ({ ...k, [tag]: a } as any))
        )
      )
    )
}

function let_<OutDone, K, N extends string>(
  tag: Exclude<N, keyof K>,
  f: (_: K) => OutDone
) {
  return <Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1>(
    mk: Core.Channel<Env1, InErr1, InElem1, InDone1, OutErr1, OutElem1, K>
  ): Core.Channel<
    Env1,
    InErr1,
    InElem1,
    InDone1,
    OutErr1,
    OutElem1,
    K & { [k in N]: OutDone }
  > =>
    pipe(
      mk,
      Api.map((k): K & { [k in N]: OutDone } => ({ ...k, [tag]: f(k) } as any))
    )
}

const do_ = Core.fromEffect(T.succeed({}))

export { let_ as let, bind, do_ as do }
