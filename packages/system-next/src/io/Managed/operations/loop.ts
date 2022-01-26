import { Managed } from "../definition"

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
 *
 * @ets static ets/ManagedOps loop
 */
export function loop<Z>(initial: Z, cont: (z: Z) => boolean, inc: (z: Z) => Z) {
  return <R, E, A>(
    body: (z: Z) => Managed<R, E, A>,
    __etsTrace?: string
  ): Managed<R, E, readonly A[]> =>
    Managed.suspend(() => {
      if (cont(initial)) {
        return body(initial).flatMap((a) =>
          loop(inc(initial), cont, inc)(body).map((as) => [a, ...as])
        )
      }
      return Managed.succeedNow([])
    })
}
