// ets_tracing: off

import type * as CK from "../../../../Collections/Immutable/Chunk"
import type * as CH from "../../Channel"
import * as C from "../core"

/**
 * Pipes all the values from this stream through the provided channel
 */
export function pipeThroughChannel_<R, R1, E, E2, A, A2>(
  self: C.Stream<R, E, A>,
  channel: CH.Channel<R1, E, CK.Chunk<A>, unknown, E2, CK.Chunk<A2>, any>
): C.Stream<R & R1, E2, A2> {
  return new C.Stream(self.channel[">>>"](channel))
}

/**
 * Pipes all the values from this stream through the provided channel
 */
export function pipeThroughChannel<R1, E, E2, A, A2>(
  channel: CH.Channel<R1, E, CK.Chunk<A>, unknown, E2, CK.Chunk<A2>, any>
) {
  return <R>(self: C.Stream<R, E, A>) => pipeThroughChannel_(self, channel)
}
