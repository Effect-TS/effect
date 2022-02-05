// ets_tracing: off

import type * as CK from "../../../../Collections/Immutable/Chunk/index.js"
import * as H from "../../../../Hub/index.js"
import type * as C from "../core.js"
import * as Chain from "./chain.js"
import * as FromChunkQueue from "./fromChunkQueue.js"
import * as Managed from "./managed.js"

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
