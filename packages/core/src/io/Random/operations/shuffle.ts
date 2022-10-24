import type { Chunk } from "@fp-ts/data/Chunk"

/**
 * @tsplus static effect/core/io/Random.Ops shuffle
 * @category constructors
 * @since 1.0.0
 */
export function shuffle<A>(collection: Iterable<A>): Effect<never, never, Chunk<A>> {
  return Effect.randomWith((random) => random.shuffle(collection))
}
