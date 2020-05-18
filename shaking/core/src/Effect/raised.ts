import { Cause } from "../Exit"
import { IRaised } from "../Support/Common"
import { SyncE } from "../Support/Common/effect"

/**
 * An IO that is failed
 *
 * Prefer raiseError or raiseAbort
 * @param e
 */
export function raised<E, A = never>(e: Cause<E>): SyncE<E, A> {
  return new IRaised(e) as any
}
