import * as Chunk from "@fp-ts/data/Chunk"

/**
 * Statefully and effectfully maps over the elements of this chunk to produce
 * new elements.
 *
 * @tsplus static effect/core/io/Effect.Ops mapAccum
 * @category mapping
 * @since 1.0.0
 */
export function mapAccum<A, B, R, E, S>(
  as: Iterable<A>,
  s: S,
  f: (s: S, a: A) => Effect<R, E, readonly [S, B]>
): Effect<R, E, readonly [S, Chunk.Chunk<B>]> {
  return Effect.suspendSucceed(() => {
    const iterator = as[Symbol.iterator]()
    const builder: Array<B> = []
    let result: Effect<R, E, S> = Effect.succeed(s)
    let next: IteratorResult<A, any>
    while (!(next = iterator.next()).done) {
      result = result.flatMap((state) =>
        f(state, next.value).map(([s, b]) => {
          builder.push(b)
          return s
        })
      )
    }
    return result.map((s) => [s, Chunk.fromIterable(builder)] as const)
  })
}
