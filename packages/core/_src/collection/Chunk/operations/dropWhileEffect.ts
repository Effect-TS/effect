import { concreteChunkId } from "@tsplus/stdlib/collections/Chunk/definition"

/**
 * Drops all elements so long as the predicate returns true.
 *
 * @tsplus fluent Chunk dropWhileEffect
 */
export function dropWhileEffect_<R, E, A>(
  self: Chunk<A>,
  f: (a: A) => Effect<R, E, boolean>,
  __tsplusTrace?: string
): Effect<R, E, Chunk<A>> {
  return Effect.suspendSucceed(() => {
    const iterator = concreteChunkId(self)._arrayLikeIterator()
    let next
    let dropping: Effect<R, E, boolean> = Effect.succeed(true)
    let builder = Chunk.empty<A>()

    while ((next = iterator.next()) && !next.done) {
      const array = next.value
      const len = array.length
      let i = 0
      while (i < len) {
        const a = array[i]!
        dropping = dropping.flatMap((d) =>
          (d ? f(a) : Effect.succeed(false)).map((b) => {
            if (!b) {
              builder = builder.append(a)
            }
            return b
          })
        )
        i++
      }
    }
    return dropping.map(() => builder)
  })
}

/**
 * Drops all elements so long as the predicate returns true.
 *
 * @tsplus static Chunk/Aspects dropWhileEffect
 */
export const dropWhileEffect = Pipeable(dropWhileEffect_)
