import type { Managed } from "../definition"
import type { Effect } from "./_internal/effect"
import { finalizerExit } from "./finalizerExit"

/**
 * Creates an effect that only executes the provided finalizer as its
 * release action.
 */
export function finalizer<R, X>(
  f: Effect<R, never, X>,
  __trace?: string
): Managed<R, never, void> {
  return finalizerExit(() => f, __trace)
}
