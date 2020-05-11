import type { Ord } from "./Ord"
import { max } from "./max"
import { min } from "./min"

/**
 * Clamp a value between a minimum and a maximum
 *
 * @since 2.0.0
 */
export function clamp<A>(O: Ord<A>): (low: A, hi: A) => (x: A) => A {
  const minO = min(O)
  const maxO = max(O)
  return (low, hi) => (x) => maxO(minO(x, hi), low)
}
