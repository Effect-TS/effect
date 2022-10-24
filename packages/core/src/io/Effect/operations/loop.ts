import * as Chunk from "@fp-ts/data/Chunk"
import * as List from "@fp-ts/data/List"

/**
 * Loops with the specified effectual function, collecting the results into a
 * list. The moral equivalent of:
 *
 * @example
 * let s  = initial
 * let as = [] as readonly A[]
 *
 * while (cont(s)) {
 *   as = [body(s), ...as]
 *   s  = inc(s)
 * }
 *
 * A.reverse(as)
 *
 * @tsplus static effect/core/io/Effect.Ops loop
 * @category constructors
 * @since 1.0.0
 */
export function loop<Z>(
  initial: Z,
  cont: (z: Z) => boolean,
  inc: (z: Z) => Z
) {
  return <R, E, A>(body: (z: Z) => Effect<R, E, A>): Effect<R, E, Chunk.Chunk<A>> => {
    return loopInternal(initial, cont, inc, body).map(Chunk.fromIterable)
  }
}

function loopInternal<Z, R, E, A>(
  initial: Z,
  cont: (z: Z) => boolean,
  inc: (z: Z) => Z,
  body: (z: Z) => Effect<R, E, A>
): Effect<R, E, List.List<A>> {
  return Effect.suspendSucceed(() => {
    return cont(initial)
      ? body(initial).flatMap((a) =>
        loopInternal(inc(initial), cont, inc, body).map(List.prepend(a))
      )
      : Effect.sync(List.empty())
  })
}
