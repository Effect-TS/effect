import { tuple } from "../../Function"
import type { RIO } from "../managed"
import { access } from "./api"

/**
 * Returns an effectful function that merely swaps the elements in a `Tuple`.
 */
export function swap<A, B>(__trace?: string): RIO<readonly [A, B], readonly [B, A]> {
  return access(([a, b]: readonly [A, B]) => tuple(b, a), __trace)
}
