import type { Managed } from "../managed"
import { foldM_ } from "./foldM_"

/**
 * Recovers from errors by accepting one effect to execute for the case of an
 * error, and one effect to execute for the case of success.
 */
export function foldM<R, E, A, R1, E1, B, R2, E2, C>(
  failure: (e: E) => Managed<R1, E1, B>,
  success: (a: A) => Managed<R2, E2, C>
) {
  return (self: Managed<R, E, A>) => foldM_(self, failure, success)
}
