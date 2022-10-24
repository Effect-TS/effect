import * as Chunk from "@fp-ts/data/Chunk"

/**
 * Takes all elements so long as the effectual predicate returns true.
 *
 * @tsplus static effect/core/io/Effect.Ops takeWhile
 * @category constructors
 * @since 1.0.0
 */
export function takeWhileEffect<R, E, A>(
  as: Iterable<A>,
  f: (a: A) => Effect<R, E, boolean>
): Effect<R, E, Chunk.Chunk<A>> {
  return Effect.suspendSucceed(() => {
    const iterator = as[Symbol.iterator]()
    const builder: Array<A> = []
    let next: IteratorResult<A, any>
    let taking: Effect<R, E, boolean> = Effect.succeed(true)
    while (!(next = iterator.next()).done) {
      taking = taking.flatMap((d) =>
        (d ? f(next.value) : Effect.succeed(false)).map((b) => {
          if (b) {
            builder.push(next.value)
          }
          return b
        })
      )
    }
    return taking.map(() => Chunk.fromIterable(builder))
  })
}
