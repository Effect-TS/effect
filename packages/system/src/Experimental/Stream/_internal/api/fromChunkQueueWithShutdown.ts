// ets_tracing: off

import type * as CK from "../../../../Collections/Immutable/Chunk"
import * as Q from "../../../../Queue"
import type * as C from "../core"
import * as Ensuring from "./ensuring"
import * as FromChunkQueue from "./fromChunkQueue"

/**
 * Creates a stream from a queue of values. The queue will be shutdown once the stream is closed.
 */
export function fromChunkQueueWithShutdown<R, E, O>(
  queue: Q.XQueue<never, R, unknown, E, never, CK.Chunk<O>>
): C.Stream<R, E, O> {
  return Ensuring.ensuring_(FromChunkQueue.fromChunkQueue(queue), Q.shutdown(queue))
}
