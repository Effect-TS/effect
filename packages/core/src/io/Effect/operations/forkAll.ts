/**
 * Returns an effect that forks all of the specified values, and returns a
 * composite fiber that produces a list of their results, in order.
 *
 * @tsplus static effect/core/io/Effect.Ops forkAll
 */
export function forkAll<R, E, A>(
  effects: Collection<Effect<R, E, A>>
): Effect<R, never, Fiber<E, Chunk<A>>> {
  return Effect.forEach(effects, (effect) => effect.fork).map((chunk) => Fiber.collectAll(chunk))
}
