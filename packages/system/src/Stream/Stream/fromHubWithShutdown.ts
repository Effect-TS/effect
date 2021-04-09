import type * as H from "../../Hub"
import type { Stream } from "./definitions"
import { ensuringFirst_ } from "./ensuringFirst"

/**
 * Creates a stream from a subscription to a hub.
 */
export function fromHub<R, E, A>(
  hub: H.XHub<never, R, unknown, E, never, A>
): Stream<R, E, A> {
  return ensuringFirst_(fromHub(hub), hub.shutdown)
}
