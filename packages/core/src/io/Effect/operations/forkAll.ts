import type { Chunk } from "../../../collection/immutable/Chunk"
import * as Fiber from "../../Fiber"
import type { RIO } from "../definition"
import { Effect } from "../definition"

/**
 * Returns an effect that forks all of the specified values, and returns a
 * composite fiber that produces a list of their results, in order.
 *
 * @tsplus static ets/EffectOps forkAll
 */
export function forkAll<R, E, A>(
  effects: Iterable<Effect<R, E, A>>,
  __tsplusTrace?: string
): RIO<R, Fiber.Fiber<E, Chunk<A>>> {
  return Effect.forEach(effects, (_) => _.fork()).map(Fiber.collectAll)
}
