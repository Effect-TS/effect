import type { Chunk } from "@fp-ts/data/Chunk"

/**
 * Returns an effect that forks all of the specified values, and returns a
 * composite fiber that produces a list of their results, in order.
 *
 * @tsplus static effect/core/io/Effect.Ops forkAll
 * @category forking
 * @since 1.0.0
 */
export function forkAll<R, E, A>(
  effects: Iterable<Effect<R, E, A>>
): Effect<R, never, Fiber<E, Chunk<A>>> {
  return Effect.forEach(effects, (effect) => effect.fork).map((chunk) => Fiber.collectAll(chunk))
}
