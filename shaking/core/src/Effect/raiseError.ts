import { raise } from "../Exit"
import { SyncE } from "../Support/Common/effect"

import { raised } from "./raised"

/**
 * An IO that is failed with a checked error
 * @param e
 */
export function raiseError<E>(e: E): SyncE<E, never> {
  return raised(raise(e))
}
