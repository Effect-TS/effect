import type { Array } from "../../Array"
import type { XQueue } from "../../Queue"
import type { AsyncRE } from "./definitions"
import { ensuringFirst_ } from "./ensuringFirst"
import { fromArrayQueue } from "./fromArrayQueue"

/**
 * Creates a stream from a {@link XQueue} of values. The queue will be shutdown once the stream is closed.
 */
export function fromArrayQueueWithShutdown<R, E, O>(
  queue: XQueue<never, R, unknown, E, never, Array<O>>
): AsyncRE<R, E, O> {
  return ensuringFirst_(fromArrayQueue(queue), queue.shutdown)
}
