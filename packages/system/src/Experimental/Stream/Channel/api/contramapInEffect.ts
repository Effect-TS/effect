// ets_tracing: off

import type * as T from "../../../../Effect/index.js"
import * as C from "../core.js"
import * as ReadWith from "./readWith.js"
import * as ZipRight from "./zipRight.js"

function contramapInMReader<Env1, InErr, InElem0, InElem, InDone>(
  f: (a: InElem0) => T.Effect<Env1, InErr, InElem>
): C.Channel<Env1, InErr, InElem0, InDone, InErr, InElem, InDone> {
  return ReadWith.readWith(
    (_in) =>
      ZipRight.zipRight_(
        C.chain_(C.fromEffect(f(_in)), (_) => C.write(_)),
        contramapInMReader(f)
      ),
    (err) => C.fail(err),
    (done) => C.end(done)
  )
}

export function contramapInEffect_<
  Env,
  Env1,
  InErr,
  InElem0,
  InElem,
  InDone,
  OutErr,
  OutElem,
  OutDone
>(
  self: C.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  f: (a: InElem0) => T.Effect<Env1, InErr, InElem>
): C.Channel<Env1 & Env, InErr, InElem0, InDone, OutErr, OutElem, OutDone> {
  return C.pipeTo_(contramapInMReader(f), self)
}

/**
 * @ets_data_first contramapInEffect_
 */
export function contramapInEffect<Env1, InErr, InElem0, InElem>(
  f: (a: InElem0) => T.Effect<Env1, InErr, InElem>
) {
  return <Env, InDone, OutErr, OutElem, OutDone>(
    self: C.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  ) => contramapInEffect_(self, f)
}
