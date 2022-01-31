// ets_tracing: off

import * as H from "../../../../Hub/index.js"
import * as C from "../core.js"
import * as Ensuring from "./ensuring.js"
import * as FromHub from "./fromHub.js"

/**
 * Creates a stream from a subscription to a hub.
 *
 * The hub will be shut down once the stream is closed.
 */
export function fromHubWithShutdown_<R, E, A>(
  hub: H.XHub<never, R, unknown, E, never, A>,
  maxChunkSize = C.DEFAULT_CHUNK_SIZE
): C.Stream<R, E, A> {
  return Ensuring.ensuring_(FromHub.fromHub_(hub, maxChunkSize), H.shutdown(hub))
}

/**
 * Creates a stream from a subscription to a hub.
 *
 * The hub will be shut down once the stream is closed.
 *
 * @ets_data_first fromHubWithShutdown_
 */
export function fromHubWithShutdown(maxChunkSize = C.DEFAULT_CHUNK_SIZE) {
  return <R, E, A>(hub: H.XHub<never, R, unknown, E, never, A>) =>
    fromHubWithShutdown_(hub, maxChunkSize)
}
