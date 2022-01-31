// ets_tracing: off

import * as O from "../../../../Option/index.js"
import * as C from "../core.js"
import * as ReadWith from "./readWith.js"
import * as ZipRight from "./zipRight.js"

/**
 * Returns a new channel, which is the same as this one, except its outputs are filtered and
 * transformed by the specified partial function.
 */
export function collect_<
  Env,
  InErr,
  InElem,
  InDone,
  OutErr,
  OutElem,
  OutElem2,
  OutDone
>(
  self: C.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  f: (o: OutElem) => O.Option<OutElem2>
): C.Channel<Env, InErr, InElem, InDone, OutErr, OutElem2, OutDone> {
  const collector: C.Channel<Env, OutErr, OutElem, OutDone, OutErr, OutElem2, OutDone> =
    ReadWith.readWith(
      (o) =>
        O.fold_(
          f(o),
          () => collector,
          (out2) => ZipRight.zipRight_(C.write(out2), collector)
        ),
      (e) => C.fail(e),
      (z) => C.end(z)
    )

  return C.pipeTo_(self, collector)
}

/**
 * Returns a new channel, which is the same as this one, except its outputs are filtered and
 * transformed by the specified partial function.
 *
 * @ets_data_first collect_
 */
export function collect<OutElem, OutElem2>(f: (o: OutElem) => O.Option<OutElem2>) {
  return <Env, InErr, InElem, InDone, OutErr, OutDone>(
    self: C.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
  ) => collect_(self, f)
}
