// ets_tracing: off

import type * as CK from "../../../Collections/Immutable/Chunk"
import * as CH from "../Channel"
import * as C from "./core"

/**
 * A sink that ignores all of its inputs.
 */
export function drain<Err, A>() {
  const drain: CH.Channel<
    unknown,
    Err,
    CK.Chunk<A>,
    unknown,
    Err,
    CK.Chunk<never>,
    void
  > = CH.readWithCause(
    (_) => drain,
    CH.failCause,
    (_) => CH.unit
  )

  return new C.Sink(drain)
}
