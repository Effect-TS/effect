// ets_tracing: off

import * as C from "../core.js"

/**
 * Returns a new channel which reads all the elements from upstream's output channel
 * and ignores them, then terminates with the upstream result value.
 */
export function drain<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>(
  self: C.Channel<Env, InErr, InElem, InDone, OutErr, OutElem, OutDone>
): C.Channel<Env, InErr, InElem, InDone, OutErr, never, OutDone> {
  const drainer: C.Channel<Env, OutErr, OutElem, OutDone, OutErr, never, OutDone> =
    C.readWithCause((_) => drainer, C.failCause, C.end)
  return self[">>>"](drainer)
}
