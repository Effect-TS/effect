// ets_tracing: off

import type * as CK from "../../../../Collections/Immutable/Chunk/index.js"
import * as Q from "../../../../Queue/index.js"
import type * as C from "../core.js"
import * as Ensuring from "./ensuring.js"
import * as FromChunkQueue from "./fromChunkQueue.js"

/**
 * Creates a stream from a queue of values. The queue will be shutdown once the stream is closed.
 */
export function fromChunkQueueWithShutdown<R, E, O>(
  queue: Q.XQueue<never, R, unknown, E, never, CK.Chunk<O>>
): C.Stream<R, E, O> {
  return Ensuring.ensuring_(FromChunkQueue.fromChunkQueue(queue), Q.shutdown(queue))
}
