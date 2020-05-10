import { abort } from "../Exit"
import { Sync } from "../Support/Common/effect"

import { raised } from "./raised"

/**
 * An IO that is failed with an unchecked error
 * @param u
 */
export function raiseAbort(u: unknown): Sync<never> {
  return raised(abort(u))
}
