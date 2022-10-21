import { concreteChunkId } from "@tsplus/stdlib/collections/Chunk"

/**
 * Drops all elements so long as the predicate returns true.
 *
 * @tsplus static effect/core/io/Effect.Ops dropWhile
 */
export function dropWhile<R, E, A>(
  self: Collection<A>,
  f: (a: A) => Effect<R, E, boolean>
): Effect<R, E, Chunk<A>> {
  return Effect.suspendSucceed(() => {
    const chunk = Chunk.from(self)
    const iterator = concreteChunkId(chunk)._arrayLikeIterator()
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
