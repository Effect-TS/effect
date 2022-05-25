/**
 * Loops with the specified transactional function purely for its
 * transactional effects. The moral equivalent of:
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
 * @tsplus static ets/STM/Ops loopDiscard
 */
export function loopDiscard<Z>(
  initial: LazyArg<Z>,
  cont: (z: Z) => boolean,
  inc: (z: Z) => Z
) {
  return <R, E, X>(body: (z: Z) => STM<R, E, X>): STM<R, E, void> => {
    return STM.suspend(() => {
      const initial0 = initial()
      return cont(initial0)
        ? body(initial0) > loopDiscard(inc(initial0), cont, inc)(body)
        : STM.unit
    })
  }
}
