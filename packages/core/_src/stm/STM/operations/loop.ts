/**
 * Loops with the specified transactional function, collecting the results
 * into a list. The moral equivalent of:
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
 * @tsplus static effect/core/stm/STM.Ops loop
 */
export function loop<Z>(
  initial: LazyArg<Z>,
  cont: (z: Z) => boolean,
  inc: (z: Z) => Z
) {
  return <R, E, A>(body: (z: Z) => STM<R, E, A>): STM<R, E, Chunk<A>> => {
    return loopInternal(initial, cont, inc, body).map((list: ListBuffer<A>) => Chunk.from(list))
  }
}

function loopInternal<Z, R, E, A>(
  initial: LazyArg<Z>,
  cont: (z: Z) => boolean,
  inc: (z: Z) => Z,
  body: (z: Z) => STM<R, E, A>
): STM<R, E, ListBuffer<A>> {
  return STM.suspend(() => {
    const initial0 = initial()
    return cont(initial0)
      ? body(initial0).flatMap((a) =>
        loopInternal(inc(initial0), cont, inc, body).map((as) => {
          as.prepend(a)
          return as
        })
      )
      : STM.succeed(ListBuffer.empty())
  })
}
