import type { Equal } from "../../../../prelude/Equal"
import type { HashSet } from "../definition"

/**
 * Constructs an `Equal` for a `HashSet`.
 *
 * @tsplus static ets/HashSetOps equal
 */
export function equal<A>(): Equal<HashSet<A>> {
  return {
    equals: (x, y) => {
      if (x === y) {
        return true
      }
      if (x.size !== y.size) {
        return false
      }
      let eq = true
      for (const vx of x) {
        if (!y.has(vx)) {
          eq = false
          break
        }
      }
      return eq
    }
  }
}
