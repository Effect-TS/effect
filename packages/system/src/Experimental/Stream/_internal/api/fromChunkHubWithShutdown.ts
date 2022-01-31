// ets_tracing: off

import type * as CK from "../../../../Collections/Immutable/Chunk"
import * as H from "../../../../Hub"
import type * as C from "../core.js"
import * as Ensuring from "./ensuring"
import * as FromChunkHub from "./fromChunkHub.js"

/**
 * Creates a stream from a subscription to a hub.
 *
 * The hub will be shut down once the stream is closed.
 */
export function fromChunkHubWithShutdown<R, E, O>(
  hub: H.XHub<never, R, unknown, E, never, CK.Chunk<O>>
): C.Stream<R, E, O> {
  return Ensuring.ensuring_(FromChunkHub.fromChunkHub(hub), H.shutdown(hub))
}
