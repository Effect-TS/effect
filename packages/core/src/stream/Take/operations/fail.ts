import { Option } from "../../../data/Option"
import { Exit } from "../../../io/Exit"
import type { Take } from "../definition"
import { TakeInternal } from "./_internal/TakeInternal"

/**
 * Creates a failing `Take<E, unknown>` with the specified failure.
 *
 * @tsplus static ets/TakeOps fail
 */
export function fail<E>(e: E): Take<E, never> {
  return new TakeInternal(Exit.fail(Option.some(e)))
}
