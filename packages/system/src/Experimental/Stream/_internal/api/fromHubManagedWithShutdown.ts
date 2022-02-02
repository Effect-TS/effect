// ets_tracing: off

import * as H from "../../../../Hub/index.js"
import * as M from "../../../../Managed/index.js"
import * as C from "../core.js"
import * as Ensuring from "./ensuring.js"
import * as FromHubManaged from "./fromHubManaged.js"

/**
 * Creates a stream from a subscription to a hub in the context of a managed
 * effect. The managed effect describes subscribing to receive messages from
 * the hub while the stream describes taking messages from the hub.
 *
 * The hub will be shut down once the stream is closed.
 */
export function fromHubManagedWithShutdown_<R, E, A>(
  hub: H.XHub<never, R, unknown, E, never, A>,
  maxChunkSize = C.DEFAULT_CHUNK_SIZE
): M.UIO<C.Stream<R, E, A>> {
  return M.map_(
    FromHubManaged.fromHubManaged_(hub, maxChunkSize),
    Ensuring.ensuring(H.shutdown(hub))
  )
}

/**
 * Creates a stream from a subscription to a hub in the context of a managed
 * effect. The managed effect describes subscribing to receive messages from
 * the hub while the stream describes taking messages from the hub.
 *
 * The hub will be shut down once the stream is closed.
 *
 * @ets_data_first fromHubManagedWithShutdown_
 */
export function fromHubManagedWithShutdown(maxChunkSize = C.DEFAULT_CHUNK_SIZE) {
  return <R, E, A>(hub: H.XHub<never, R, unknown, E, never, A>) =>
    fromHubManagedWithShutdown_(hub, maxChunkSize)
}
