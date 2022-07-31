import { concreteChunkId } from "@tsplus/stdlib/collections/Chunk/definition"

/**
 * Takes all elements so long as the effectual predicate returns true.
 *
 * @tsplus fluent Chunk takeWhileEffect
 */
export function takeWhileEffect_<R, E, A>(
  self: Chunk<A>,
  f: (a: A) => Effect<R, E, boolean>
): Effect<R, E, Chunk<A>> {
  return Effect.suspendSucceed(() => {
    const iterator = concreteChunkId(self)._arrayLikeIterator()
    let next
    let taking: Effect<R, E, boolean> = Effect.succeed(true)
    let builder = Chunk.empty<A>()

    while ((next = iterator.next()) && !next.done) {
      const array = next.value
      const len = array.length
      let i = 0
      while (i < len) {
        const a = array[i]!
        taking = taking.flatMap((d) =>
          (d ? f(a) : Effect.succeed(false)).map((b) => {
            if (b) {
              builder = builder.append(a)
            }
            return b
          })
        )
        i++
      }
    }
    return taking.map(() => builder)
  })
}

/**
 * Takes all elements so long as the effectual predicate returns true.
 *
 * @tsplus static Chunk/Aspects takeWhileEffect
 */
export const takeWhileEffect = Pipeable(takeWhileEffect_)
