// ets_tracing: off

import type * as Ex from "../../Exit/index.js"
import * as T from "../_internal/effect.js"
import type { Stream } from "./definitions.js"
import { mapM_ } from "./mapM.js"

/**
 * Flattens `Exit` values. `Exit.Failure` values translate to stream failures
 * while `Exit.Success` values translate to stream elements.
 */
export function flattenExit<R, E, E1, O1>(self: Stream<R, E, Ex.Exit<E1, O1>>) {
  return mapM_(self, (o) => T.done(o))
}
