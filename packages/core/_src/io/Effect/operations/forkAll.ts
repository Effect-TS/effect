/**
 * Returns an effect that forks all of the specified values, and returns a
 * composite fiber that produces a list of their results, in order.
 *
 * @tsplus static ets/Effect/Ops forkAll
 */
export function forkAll<R, E, A>(
  effects: Collection<Effect<R, E, A>>,
  __tsplusTrace?: string
): RIO<R, Fiber<E, Chunk<A>>> {
  return Effect.forEach(effects, (effect) => effect.fork()).map((chunk) => Fiber.collectAll(chunk));
}
