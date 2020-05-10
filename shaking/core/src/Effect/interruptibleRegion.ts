import { IInterruptibleRegion } from "../Support/Common"
import { Effect } from "../Support/Common/effect"

/**
 * Demarcate a region of interruptible state
 * @param inner
 * @param flag
 */
export function interruptibleRegion<S, R, E, A>(
  inner: Effect<S, R, E, A>,
  flag: boolean
): Effect<S, R, E, A> {
  return new IInterruptibleRegion(inner, flag) as any
}
