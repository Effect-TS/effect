import type * as A from "../../Collections/Immutable/Chunk"
import * as H from "../../Hub"
import { chain_ } from "./chain.js"
import type { Stream } from "./definitions"
import { fromChunkQueue } from "./fromChunkQueue.js"
import { managed } from "./managed.js"

/**
 * Creates a stream from a `Hub`. The hub will be shutdown once the stream is closed.
 */
export function fromChunkHub<R, E, O>(
  hub: H.XHub<never, R, unknown, E, never, A.Chunk<O>>
): Stream<R, E, O> {
  return chain_(managed(H.subscribe(hub)), (queue) => fromChunkQueue(queue))
}
