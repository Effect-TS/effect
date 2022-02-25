import type { LazyArg } from "../../../data/Function"
import { Managed } from "../definition"

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
 * @tsplus static ets/ManagedOps iterate
 */
export function iterate<Z>(initial: LazyArg<Z>) {
  return (cont: (z: Z) => boolean) =>
    <R, E>(
      body: (z: Z) => Managed<R, E, Z>,
      __tsplusTrace?: string
    ): Managed<R, E, Z> =>
      Managed.suspend(() => {
        const initial0 = initial()
        if (cont(initial0)) {
          return body(initial0).flatMap((z2) => iterate(z2)(cont)(body))
        }
        return Managed.succeedNow(initial0)
      })
}
