import { Effect } from "../definition"

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
 *
 * @ets static ets/EffectOps loopDiscard
 */
export function loopDiscard<Z>(initial: Z, cont: (z: Z) => boolean, inc: (z: Z) => Z) {
  return <R, E, X>(
    body: (z: Z) => Effect<R, E, X>,
    __etsTrace?: string
  ): Effect<R, E, void> => {
    return Effect.suspendSucceed(() => {
      if (cont(initial)) {
        return body(initial).flatMap(() => loopDiscard(inc(initial), cont, inc)(body))
      }
      return Effect.unit
    })
  }
}
