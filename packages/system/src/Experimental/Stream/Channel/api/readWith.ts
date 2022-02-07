// ets_tracing: off

import * as CS from "../../../../Cause/index.js"
import * as E from "../../../../Either/index.js"
import * as C from "../core.js"

/**
 * Reads an input and continue exposing both error and completion
 */
export function readWith<
  Env,
  Env1,
  Env2,
  InErr,
  InElem,
  InDone,
  OutErr,
  OutErr1,
  OutErr2,
  OutElem,
  OutElem1,
  OutElem2,
  OutDone,
  OutDone1,
  OutDone2
>(
  inp: (i: InElem) => C.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>,
  error: (
    e: InErr
  ) => C.Channel<Env1, InErr, InElem, InDone, OutErr1, OutElem1, OutDone1>,
  done: (
    d: InDone
  ) => C.Channel<Env2, InErr, InElem, InDone, OutErr2, OutElem2, OutDone2>
): C.Channel<
  Env & Env1 & Env2,
  InErr,
  InElem,
  InDone,
  OutErr | OutErr1 | OutErr2,
  OutElem | OutElem1 | OutElem2,
  OutDone | OutDone1 | OutDone2
> {
  return C.readWithCause(
    inp,
    (c) => E.fold_(CS.failureOrCause(c), error, C.failCause),
    done
  )
}
