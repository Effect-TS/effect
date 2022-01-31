// ets_tracing: off

import * as H from "../../../Hub/index.js"
import type * as C from "./core.js"
import * as FromQueue from "./fromQueue.js"

/**
 * Create a sink which enqueues each element into the specified queue.
 */
export function fromHub<R, InErr, E, I>(
  hub: H.XHub<R, never, E, unknown, I, any>
): C.Sink<R, InErr, I, InErr | E, unknown, void> {
  return FromQueue.fromQueue<R, InErr, E, I>(H.toQueue(hub))
}
