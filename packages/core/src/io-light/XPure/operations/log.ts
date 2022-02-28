import type { LazyArg } from "../../../data/Function"
import type { XPure } from "../definition"
import { Log } from "../definition"

/**
 * Constructs a computation that lazily logs `W`.
 */
export function log<S, W>(w: LazyArg<W>): XPure<W, S, S, unknown, never, never> {
  return new Log(w)
}
