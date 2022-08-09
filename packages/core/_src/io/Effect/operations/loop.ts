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
 * @tsplus static effect/core/io/Effect.Ops loop
 */
export function loop<Z>(
  initial: Z,
  cont: (z: Z) => boolean,
  inc: (z: Z) => Z
) {
  return <R, E, A>(body: (z: Z) => Effect<R, E, A>): Effect<R, E, Chunk<A>> => {
    return loopInternal(initial, cont, inc, body).map((listBuffer) => Chunk.from(listBuffer))
  }
}

function loopInternal<Z, R, E, A>(
  initial: Z,
  cont: (z: Z) => boolean,
  inc: (z: Z) => Z,
  body: (z: Z) => Effect<R, E, A>
): Effect<R, E, ListBuffer<A>> {
  return Effect.suspendSucceed(() => {
    return cont(initial)
      ? body(initial).flatMap((a) =>
        loopInternal(inc(initial), cont, inc, body).map((as) => {
          as.prepend(a)
          return as
        })
      )
      : Effect.sync(ListBuffer.empty())
  })
}
