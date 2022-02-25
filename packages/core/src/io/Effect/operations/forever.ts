import { Effect } from "../definition"

/**
 * Repeats this effect forever (until the first error).
 *
 * @tsplus fluent ets/Effect forever
 */
export function forever<R, E, A>(
  effect: Effect<R, E, A>,
  __tsplusTrace?: string
): Effect<R, E, never> {
  return effect > Effect.yieldNow > forever(effect)
}
