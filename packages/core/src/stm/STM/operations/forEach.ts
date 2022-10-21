import * as Chunk from "@fp-ts/data/Chunk"

/**
 * Applies the function `f` to each element of the `Collection<A>` and
 * returns a transactional effect that produces a new `Chunk<B>`.
 *
 * @tsplus static effect/core/stm/STM.Ops forEach
 */
export function forEach<A, R, E, B>(
  as: Iterable<A>,
  f: (a: A) => STM<R, E, B>
): STM<R, E, Chunk.Chunk<B>> {
  return STM.suspend(() => {
    let stm = STM.succeed([]) as STM<R, E, B[]>
    for (const a of as) {
      stm = stm.zipWith(f(a), (acc, b) => {
        acc.push(b)
        return acc
      })
    }
    return stm.map(Chunk.fromIterable)
  })
}
