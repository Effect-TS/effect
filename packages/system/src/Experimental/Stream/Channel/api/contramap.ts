// ets_tracing: off

import * as C from "../core.js"
import * as ReadWith from "./readWith.js"
import * as ZipRight from "./zipRight.js"

function contramapReader<InErr, InElem, InDone0, InDone>(
  f: (a: InDone0) => InDone
): C.Channel<unknown, InErr, InElem, InDone0, InErr, InElem, InDone> {
  return ReadWith.readWith(
    (_in) => ZipRight.zipRight_(C.write(_in), contramapReader(f)),
    (err) => C.fail(err),
    (done) => C.end(f(done))
  )
}

export function contramap_<
  Env,
  InErr,
  InElem,
  InDone0,
  InDone,
  OutErr,
  OutElem,
  OutDone
>(
  self: C.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  f: (a: InDone0) => InDone
): C.Channel<Env, InErr, InElem, InDone0, OutErr, OutElem, OutDone> {
  return C.pipeTo_(contramapReader(f), self)
}

/**
 * @ets_data_first contramap_
 */
export function contramap<InDone, InDone0>(f: (a: InDone0) => InDone) {
  return <Env, InErr, InElem, OutErr, OutElem, OutDone>(
    self: C.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  ) => contramap_(self, f)
}
