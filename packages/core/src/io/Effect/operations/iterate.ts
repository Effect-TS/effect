/**
 * Iterates with the specified effectual function. The moral equivalent of:
 *
 * @example
 * let s = initial
 *
 * while (cont(s)) {
 *   s = body(s)
 * }
 *
 * return s
 *
 * @tsplus static effect/core/io/Effect.Ops iterate
 * @category constructors
 * @since 1.0.0
 */
export function iterate<Z>(initial: Z, cont: (z: Z) => boolean) {
  return <R, E>(body: (z: Z) => Effect<R, E, Z>): Effect<R, E, Z> =>
    Effect.suspendSucceed(() => {
      if (cont(initial)) {
        return body(initial).flatMap((z2) => iterate(z2, cont)(body))
      }
      return Effect.succeed(initial)
    })
}
