import type { Chunk } from "@fp-ts/data/Chunk"

/**
 * A schedule that recurs anywhere, collecting all inputs into a `Chunk`.
 *
 * @tsplus static effect/core/io/Schedule.Ops collectAll
 * @category constructors
 * @since 1.0.0
 */
export function collectAll<A>(): Schedule<readonly [void, Chunk<A>], never, A, Chunk<A>> {
  return Schedule.identity<A>().collectAll
}
