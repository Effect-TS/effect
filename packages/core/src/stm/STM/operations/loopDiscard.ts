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
 * @tsplus static effect/core/stm/STM.Ops loopDiscard
 */
export function loopDiscard<Z>(
  initial: Z,
  cont: (z: Z) => boolean,
  inc: (z: Z) => Z
) {
  return <R, E, X>(body: (z: Z) => STM<R, E, X>): STM<R, E, void> => {
    return STM.suspend(() => {
      return cont(initial)
        ? body(initial).zipRight(loopDiscard(inc(initial), cont, inc)(body))
        : STM.unit
    })
  }
}
