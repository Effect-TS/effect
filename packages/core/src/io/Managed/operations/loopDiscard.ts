import { Managed } from "../definition"

/**
 * Loops with the specified effectual function purely for its effects. The
 * moral equivalent of:
 *
 * ```typescript
 * var s = initial
 *
 * while (cont(s)) {
 *   body(s)
 *   s = inc(s)
 * }
 * ```
 */
export function loopDiscard<Z>(initial: Z, cont: (z: Z) => boolean, inc: (z: Z) => Z) {
  return <R, E, X>(
    body: (z: Z) => Managed<R, E, X>,
    __tsplusTrace?: string
  ): Managed<R, E, void> =>
    Managed.suspend(() => {
      if (cont(initial)) {
        return body(initial).flatMap(() => loopDiscard(inc(initial), cont, inc)(body))
      }
      return Managed.unit
    })
}
