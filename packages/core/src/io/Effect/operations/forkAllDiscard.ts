import { Effect } from "../definition"

/**
 * Returns an effect that forks all of the specified values, and returns a
 * composite fiber that produces unit. This version is faster than `forkAll`
 * in cases where the results of the forked fibers are not needed.
 *
 * @tsplus static ets/EffectOps forkAllDiscard
 */
export function forkAllDiscard<R, E, A>(
  effects: Iterable<Effect<R, E, A>>,
  __tsplusTrace?: string
): Effect<R, never, void> {
  return Effect.forEachDiscard(effects, (effect) => effect.fork())
}
