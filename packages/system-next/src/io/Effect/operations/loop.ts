import * as L from "../../../collection/immutable/List"
import type { LazyArg } from "../../../data/Function"
import { Effect } from "../definition"

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
 * @tsplus static ets/EffectOps loop
 */
export function loop<Z>(
  initial: LazyArg<Z>,
  cont: (z: Z) => boolean,
  inc: (z: Z) => Z
) {
  return <R, E, A>(
    body: (z: Z) => Effect<R, E, A>,
    __etsTrace?: string
  ): Effect<R, E, readonly A[]> => {
    return loopInternal_(initial, cont, inc, body).map((x) => Array.from(L.reverse(x)))
  }
}

function loopInternal_<Z, R, E, A>(
  initial: LazyArg<Z>,
  cont: (z: Z) => boolean,
  inc: (z: Z) => Z,
  body: (z: Z) => Effect<R, E, A>,
  __etsTrace?: string
): Effect<R, E, L.MutableList<A>> {
  return Effect.suspendSucceed(() => {
    const initial0 = initial()
    if (cont(initial0)) {
      return body(initial0).flatMap((a) =>
        loopInternal_(inc(initial0), cont, inc, body).map((as) => {
          L.push_(as, a)
          return as
        })
      )
    }
    return Effect.succeed(L.emptyPushable())
  })
}
