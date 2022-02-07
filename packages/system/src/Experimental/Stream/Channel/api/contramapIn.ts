// ets_tracing: off

import * as C from "../core.js"
import * as ReadWith from "./readWith.js"
import * as ZipRight from "./zipRight.js"

function contramapInReader<InErr, InElem0, InElem, InDone>(
  f: (a: InElem0) => InElem
): C.Channel<unknown, InErr, InElem0, InDone, InErr, InElem, InDone> {
  return ReadWith.readWith(
    (_in) => ZipRight.zipRight_(C.write(f(_in)), contramapInReader(f)),
    (err) => C.fail(err),
    (done) => C.end(done)
  )
}

export function contramapIn_<
  Env,
  InErr,
  InElem0,
  InElem,
  InDone,
  OutErr,
  OutElem,
  OutDone
>(
  self: C.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  f: (a: InElem0) => InElem
): C.Channel<Env, InErr, InElem0, InDone, OutErr, OutElem, OutDone> {
  return C.pipeTo_(contramapInReader(f), self)
}

/**
 * @ets_data_first contramapIn_
 */
export function contramapIn<InElem0, InElem>(f: (a: InElem0) => InElem) {
  return <Env, InErr, InDone, OutErr, OutElem, OutDone>(
    self: C.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  ) => contramapIn_(self, f)
}
