import type { Managed } from "../definition"
import { chain_ } from "./chain"
import { map_ } from "./map"
import { succeedNow } from "./succeedNow"
import { suspend } from "./suspend"

/**
 * Loops with the specified effectual function, collecting the results into a
 * list. The moral equivalent of:
 *
 * ```typescript
 * let s  = initial
 * let as = [] as readonly A[]
 *
 * while (cont(s)) {
 *   as = [body(s), ...as]
 *   s  = inc(s)
 * }
 *
 * A.reverse(as)
 * ```
 */
export function loop<Z>(initial: Z, cont: (z: Z) => boolean, inc: (z: Z) => Z) {
  return <R, E, A>(
    body: (z: Z) => Managed<R, E, A>,
    __trace?: string
  ): Managed<R, E, readonly A[]> =>
    suspend(() => {
      if (cont(initial)) {
        return chain_(body(initial), (a) =>
          map_(loop(inc(initial), cont, inc)(body), (as) => [a, ...as])
        )
      }
      return succeedNow([])
    }, __trace)
}
