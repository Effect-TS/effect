// tracing: off

import * as H from "../../Hub"
import { chain_ } from "./chain"
import type { Stream } from "./definitions"
import { fromQueue } from "./fromQueue"
import { managed } from "./managed"

/**
 * Creates a stream from a subscription to a hub.
 */
export function fromHub<R, E, A>(
  hub: H.XHub<never, R, unknown, E, never, A>
): Stream<R, E, A> {
  return chain_(managed(H.subscribe(hub)), (queue) => fromQueue(queue))
}
