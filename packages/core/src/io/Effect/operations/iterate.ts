import type { LazyArg } from "../../../data/Function"
import { Effect } from "../definition"

/**
 * Iterates with the specified effectual function. The moral equivalent of:
 *
 * ```typescript
 * let s = initial
 *
 * while (cont(s)) {
 *   s = body(s)
 * }
 *
 * return s
 * ```
 *
 * @tsplus static ets/EffectOps iterate
 */
export function iterate<Z>(initial: LazyArg<Z>, cont: (z: Z) => boolean) {
  return <R, E>(
    body: (z: Z) => Effect<R, E, Z>,
    __etsTrace?: string
  ): Effect<R, E, Z> => {
    return Effect.suspendSucceed(() => {
      const initial0 = initial()
      if (cont(initial0)) {
        return body(initial0).flatMap((z2) => iterate(z2, cont)(body))
      }
      return Effect.succeedNow(initial0)
    })
  }
}
