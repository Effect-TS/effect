// ets_tracing: off

import * as C from "../core.js"
import * as ReadWith from "./readWith.js"

/**
 * Maps the output of this channel using f
 */
export function mapOut_<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone, OutElem2>(
  self: C.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  f: (o: OutElem) => OutElem2
): C.Channel<Env, InErr, InElem, InDone, OutErr, OutElem2, OutDone> {
  const reader: C.Channel<Env, OutErr, OutElem, OutDone, OutErr, OutElem2, OutDone> =
    ReadWith.readWith((i) => C.chain_(C.write(f(i)), () => reader), C.fail, C.end)

  return self[">>>"](reader)
}

/**
 * Maps the output of this channel using f
 *
 * @ets_data_first mapOut_
 */
export function mapOut<OutElem, OutElem2>(
  f: (o: OutElem) => OutElem2
): <Env, InErr, InElem, InDone, OutErr, OutDone>(
  self: C.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
) => C.Channel<Env, InErr, InElem, InDone, OutErr, OutElem2, OutDone> {
  return (self) => mapOut_(self, f)
}
