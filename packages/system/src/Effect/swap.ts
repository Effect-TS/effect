import { tuple } from "../Function"
import { access } from "../Sync"

/**
 * Returns an effectful function that merely swaps the elements in a `Tuple2`.
 */
export function swap<A, B>() {
  return access(([a, b]: readonly [A, B]) => tuple(b, a))
}
