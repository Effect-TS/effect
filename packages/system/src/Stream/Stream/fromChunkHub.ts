import type * as A from "../../Chunk"
import type * as H from "../../Hub"
import { chain_ } from "./chain"
import type { Stream } from "./definitions"
import { fromChunkQueue } from "./fromChunkQueue"
import { managed } from "./managed"

/**
 * Creates a stream from a `Hub`. The hub will be shutdown once the stream is closed.
 */
export function fromChunkHub<R, E, O>(
  hub: H.XHub<never, R, unknown, E, never, A.Chunk<O>>
): Stream<R, E, O> {
  return chain_(managed(hub.subscribe), (queue) => fromChunkQueue(queue))
}
