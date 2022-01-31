// ets_tracing: off

import * as Q from "../../../../Queue/index.js"
import * as C from "../core.js"
import * as Ensuring from "./ensuring.js"
import * as FromQueue from "./fromQueue.js"

/**
 * Creates a stream from a queue of values. The queue will be shutdown once the stream is closed.
 *
 * @param maxChunkSize Maximum number of queued elements to put in one chunk in the stream
 */
export function fromQueueWithShutdown_<R, E, O>(
  queue: Q.XQueue<never, R, unknown, E, never, O>,
  maxChunkSize = C.DEFAULT_CHUNK_SIZE
): C.Stream<R, E, O> {
  return Ensuring.ensuring_(
    FromQueue.fromQueue_(queue, maxChunkSize),
    Q.shutdown(queue)
  )
}

/**
 * Creates a stream from a queue of values. The queue will be shutdown once the stream is closed.
 *
 * @param maxChunkSize Maximum number of queued elements to put in one chunk in the stream
 *
 * @ets_data_first fromQueueWithShutdown_
 */
export function fromQueueWithShutdown<R, E, O>(maxChunkSize = C.DEFAULT_CHUNK_SIZE) {
  return (queue: Q.XQueue<never, R, unknown, E, never, O>) =>
    fromQueueWithShutdown_(queue, maxChunkSize)
}
