// ets_tracing: off

import * as H from "../../../../Hub"
import * as C from "../core"
import * as Chain from "./chain"
import * as FromQueue from "./fromQueue"
import * as Managed from "./managed"

/**
 * Creates a stream from a subscription to a hub.
 */
export function fromHub_<R, E, A>(
  hub: H.XHub<never, R, unknown, E, never, A>,
  maxChunkSize = C.DEFAULT_CHUNK_SIZE
): C.Stream<R, E, A> {
  return Chain.chain_(Managed.managed(H.subscribe(hub)), (queue) =>
    FromQueue.fromQueue_(queue, maxChunkSize)
  )
}

/**
 * Creates a stream from a subscription to a hub.
 *
 * @ets_data_first fromHub_
 */
export function fromHub(maxChunkSize = C.DEFAULT_CHUNK_SIZE) {
  return <R, E, A>(hub: H.XHub<never, R, unknown, E, never, A>) =>
    fromHub_(hub, maxChunkSize)
}
