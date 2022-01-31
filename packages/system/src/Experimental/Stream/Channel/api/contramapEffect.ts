// ets_tracing: off

import type * as T from "../../../../Effect/index.js"
import * as C from "../core.js"
import * as ReadWith from "./readWith.js"
import * as ZipRight from "./zipRight.js"

function contramapMReader<Env1, InErr, InElem, InDone0, InDone>(
  f: (i: InDone0) => T.Effect<Env1, InErr, InDone>
): C.Channel<Env1, InErr, InElem, InDone0, InErr, InElem, InDone> {
  return ReadWith.readWith(
    (_in) => ZipRight.zipRight_(C.write(_in), contramapMReader(f)),
    (err) => C.fail(err),
    (done0) => C.fromEffect(f(done0))
  )
}

export function contramapEffect_<
  Env,
  Env1,
  InErr,
  InElem,
  InDone0,
  InDone,
  OutErr,
  OutElem,
  OutDone
>(
  self: C.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  f: (i: InDone0) => T.Effect<Env1, InErr, InDone>
): C.Channel<Env1 & Env, InErr, InElem, InDone0, OutErr, OutElem, OutDone> {
  return C.pipeTo_(contramapMReader(f), self)
}

/**
 * @ets_data_first contramapEffect_
 */
export function contramapEffect<Env1, InErr, InDone0, InDone>(
  f: (i: InDone0) => T.Effect<Env1, InErr, InDone>
) {
  return <Env, InElem, OutErr, OutElem, OutDone>(
    self: C.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  ) => contramapEffect_(self, f)
}
