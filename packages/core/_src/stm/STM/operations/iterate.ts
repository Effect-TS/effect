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
export function iterate<Z>(initial: Z, cont: (z: Z) => boolean) {
  return <R, E>(body: (z: Z) => STM<R, E, Z>): STM<R, E, Z> => {
    return STM.suspend(() => {
      if (cont(initial)) {
        return body(initial).flatMap((z2) => iterate(z2, cont)(body))
      }
      return STM.succeed(initial)
    })
  }
}
