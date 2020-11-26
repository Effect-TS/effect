/**
 * relative: ../
 */
import { Die } from "../Cause/cause"
import { halt } from "./core"

/**
 * Returns an effect that dies with the specified `unknown`.
 * This method can be used for terminating a fiber because a defect has been
 * detected in the code.
 *
 * @trace
 */
export function die(e: unknown) {
  return halt(Die(e))
}
