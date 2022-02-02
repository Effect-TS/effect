// ets_tracing: off

import * as CK from "../../../Collections/Immutable/Chunk"
import * as CH from "../Channel"
import * as C from "./core"

function collectLoop<Err, A>(
  state: CK.Chunk<A>
): CH.Channel<unknown, Err, CK.Chunk<A>, unknown, Err, CK.Chunk<never>, CK.Chunk<A>> {
  return CH.readWithCause(
    (i) => collectLoop(CK.concat_(state, i)),
    CH.failCause,
    (_) => CH.end(state)
  )
}

/**
 * A sink that collects all of its inputs into a chunk.
 */
export function collectAll<Err, A>() {
  return new C.Sink(collectLoop<Err, A>(CK.empty()))
}
