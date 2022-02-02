// ets_tracing: off

import type * as CK from "../../../../Collections/Immutable/Chunk"
import * as H from "../../../../Hub"
import type * as C from "../core"
import * as Chain from "./chain"
import * as FromChunkQueue from "./fromChunkQueue"
import * as Managed from "./managed"

/**
 * Creates a stream from a subscription to a hub.
 */
export function fromChunkHub<R, E, O>(
  hub: H.XHub<never, R, unknown, E, never, CK.Chunk<O>>
): C.Stream<R, E, O> {
  return Chain.chain_(Managed.managed(H.subscribe(hub)), (queue) =>
    FromChunkQueue.fromChunkQueue(queue)
  )
}
