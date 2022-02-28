import type { XPure } from "../definition"
import { Access } from "../definition"

/**
 * Access the environment monadically.
 *
 * @tsplus static ets/XPureOps environmentWithXPure
 */
export function environmentWithXPure<W, R, S1, S2, R1, E, A>(
  f: (_: R) => XPure<W, S1, S2, R1, E, A>
): XPure<W, S1, S2, R1 & R, E, A> {
  return new Access<W, S1, S2, R1 & R, E, A>(f)
}
