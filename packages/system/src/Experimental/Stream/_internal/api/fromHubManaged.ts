// ets_tracing: off

import * as H from "../../../../Hub"
import * as M from "../../../../Managed"
import * as C from "../core"
import * as FromQueueWithShutdown from "./fromQueueWithShutdown"

/**
 * Creates a stream from a subscription to a hub in the context of a managed
 * effect. The managed effect describes subscribing to receive messages from
 * the hub while the stream describes taking messages from the hub.
 */
export function fromHubManaged_<R, E, A>(
  hub: H.XHub<never, R, unknown, E, never, A>,
  maxChunkSize = C.DEFAULT_CHUNK_SIZE
): M.UIO<C.Stream<R, E, A>> {
  return M.map_(
    H.subscribe(hub),
    FromQueueWithShutdown.fromQueueWithShutdown(maxChunkSize)
  )
}

/**
 * Creates a stream from a subscription to a hub in the context of a managed
 * effect. The managed effect describes subscribing to receive messages from
 * the hub while the stream describes taking messages from the hub.
 *
 * @ets_data_first fromHubManaged_
 */
export function fromHubManaged(maxChunkSize = C.DEFAULT_CHUNK_SIZE) {
  return <R, E, A>(hub: H.XHub<never, R, unknown, E, never, A>) =>
    fromHubManaged_(hub, maxChunkSize)
}
