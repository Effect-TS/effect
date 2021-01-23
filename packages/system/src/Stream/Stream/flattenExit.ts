import type * as Ex from "../../Exit"
import * as T from "../_internal/effect"
import type { Stream } from "./definitions"
import { mapM_ } from "./mapM"

/**
 * Flattens `Exit` values. `Exit.Failure` values translate to stream failures
 * while `Exit.Success` values translate to stream elements.
 */
export function flattenExit<R, E, E1, O1>(self: Stream<R, E, Ex.Exit<E1, O1>>) {
  return mapM_(self, (o) => T.done(o))
}
