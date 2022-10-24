import * as Chunk from "@fp-ts/data/Chunk"

/**
 * Drops all elements so long as the predicate returns true.
 *
 * @tsplus static effect/core/io/Effect.Ops dropWhile
 * @category constructors
 * @since 1.0.0
 */
export function dropWhile<R, E, A>(
  as: Iterable<A>,
  f: (a: A) => Effect<R, E, boolean>
): Effect<R, E, Chunk.Chunk<A>> {
  return Effect.suspendSucceed(() => {
    const iterator = as[Symbol.iterator]()
    const builder: Array<A> = []
    let next
    let dropping: Effect<R, E, boolean> = Effect.succeed(true)
    while ((next = iterator.next()) && !next.done) {
      const a = next.value
      dropping = dropping.flatMap((d) =>
        (d ? f(a) : Effect.succeed(false)).map((b) => {
          if (!b) {
            builder.push(a)
          }
          return b
        })
      )
    }
    return dropping.map(() => Chunk.unsafeFromArray(builder))
  })
}
