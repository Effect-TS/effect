import { Exit } from "../../../io/Exit"
import type { Take } from "../definition"
import { TakeInternal } from "./_internal/TakeInternal"

/**
 * Creates a failing `Take<never, never>` with the specified defect.
 *
 * @tsplus static ets/TakeOps die
 */
export function die(defect: unknown): Take<never, never> {
  return new TakeInternal(Exit.die(defect))
}
