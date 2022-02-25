import type { Effect } from "../definition"
import { ISucceedNow } from "../definition"

/**
 * Returns an effect that models success with the specified value.
 *
 * @tsplus static ets/EffectOps succeedNow
 */
export function succeedNow<A>(a: A, __tsplusTrace?: string): Effect<unknown, never, A> {
  return new ISucceedNow(a, __tsplusTrace)
}
