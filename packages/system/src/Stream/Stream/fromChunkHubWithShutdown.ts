// ets_tracing: off

import type * as A from "../../Collections/Immutable/Chunk/index.js"
import * as H from "../../Hub/index.js"
import type { Stream } from "./definitions.js"
import { ensuringFirst_ } from "./ensuringFirst.js"
import { fromChunkHub } from "./fromChunkHub.js"

/**
 * Creates a stream from a `Hub` of values. The hub will be shutdown once the stream is closed.
 */
export function fromChunkHubWithShutdown<R, E, O>(
  hub: H.XHub<never, R, unknown, E, never, A.Chunk<O>>
): Stream<R, E, O> {
  return ensuringFirst_(fromChunkHub(hub), H.shutdown(hub))
}
