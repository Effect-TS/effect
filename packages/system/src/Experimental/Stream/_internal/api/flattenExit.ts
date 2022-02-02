// ets_tracing: off

import * as T from "../../../../Effect/index.js"
import type * as Ex from "../../../../Exit/index.js"
import type * as C from "../core.js"
import * as MapEffect from "./mapEffect.js"

/**
 * Flattens `Exit` values. `Exit.Failure` values translate to stream failures
 * while `Exit.Success` values translate to stream elements.
 */
export function flattenExit<R, E, E1, A>(
  self: C.Stream<R, E, Ex.Exit<E1, A>>
): C.Stream<R, E | E1, A> {
  return MapEffect.mapEffect_(self, (a) => T.done(a))
}
