import type * as A from "../../Collections/Immutable/Chunk"
import type * as H from "../../Hub"
import type { Stream } from "./definitions"
import { ensuringFirst_ } from "./ensuringFirst"
import { fromChunkHub } from "./fromChunkHub"

/**
 * Creates a stream from a `Hub` of values. The hub will be shutdown once the stream is closed.
 */
export function fromChunkHubWithShutdown<R, E, O>(
  hub: H.XHub<never, R, unknown, E, never, A.Chunk<O>>
): Stream<R, E, O> {
  return ensuringFirst_(fromChunkHub(hub), hub.shutdown)
}
