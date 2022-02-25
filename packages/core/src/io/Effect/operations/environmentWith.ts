import type { RIO } from "../definition"
import { Effect } from "../definition"

/**
 * Accesses the environment of the effect.
 *
 * @tsplus static ets/EffectOps environmentWith
 */
export function environmentWith<R, A>(
  f: (env: R) => A,
  __tsplusTrace?: string
): RIO<R, A> {
  return Effect.environment<R>().map(f)
}
