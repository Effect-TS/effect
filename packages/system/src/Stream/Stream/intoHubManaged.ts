import * as H from "../../Hub"
import type * as M from "../_internal/managed"
import type * as Take from "../Take"
import type { Stream } from "./definitions"
import { intoManaged_ } from "./intoManaged"

/**
 * Like `Stream#intoHub`, but provides the result as a `Managed` to allow for scope
 * composition.
 */
export function intoHubManaged_<R, E, O, A>(
  self: Stream<R, E, O>,
  hub: H.XHub<R, never, never, unknown, Take.Take<E, O>, A>
): M.Managed<R, E, void> {
  return intoManaged_(self, H.toQueue(hub))
}

/**
 * Like `Stream#intoHub`, but provides the result as a `Managed` to allow for scope
 * composition.
 */
export function intoHubManaged<R, E, O, A>(
  hub: H.XHub<R, never, never, unknown, Take.Take<E, O>, A>
) {
  return (self: Stream<R, E, O>) => intoHubManaged_(self, hub)
}
