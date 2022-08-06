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
 * @tsplus static effect/core/stm/STM.Ops iterate
 */
export function iterate<Z>(initial: LazyArg<Z>, cont: (z: Z) => boolean) {
  return <R, E>(body: (z: Z) => STM<R, E, Z>): STM<R, E, Z> => {
    return STM.suspend(() => {
      const initial0 = initial()
      if (cont(initial0)) {
        return body(initial0).flatMap((z2) => iterate(z2, cont)(body))
      }
      return STM.succeed(initial0)
    })
  }
}
