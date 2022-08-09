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
 * @tsplus static effect/core/io/Effect.Ops loopDiscard
 */
export function loopDiscard<Z>(
  initial: Z,
  cont: (z: Z) => boolean,
  inc: (z: Z) => Z
) {
  return <R, E, X>(body: (z: Z) => Effect<R, E, X>): Effect<R, E, void> => {
    return Effect.suspendSucceed(() => {
      return cont(initial)
        ? body(initial).zipRight(loopDiscard(inc(initial), cont, inc)(body))
        : Effect.unit
    })
  }
}
