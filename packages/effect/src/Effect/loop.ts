import { pipe } from "../Function"
import { chain_, succeed } from "./core"
import type { Effect } from "./effect"
import { map } from "./map"

/**
 * Loops with the specified effectual function, collecting the results into a
 * list. The moral equivalent of:
 *
 * ```
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
export function loop<Z>(initial: Z) {
  return (cont: (z: Z) => boolean, inc: (z: Z) => Z) => <S, R, E, A>(
    body: (z: Z) => Effect<S, R, E, A>
  ): Effect<S, R, E, readonly A[]> => {
    if (cont(initial)) {
      return chain_(body(initial), (a) =>
        pipe(
          loop(inc(initial))(cont, inc)(body),
          map((as) => [a, ...as])
        )
      )
    }
    return succeed([])
  }
}
