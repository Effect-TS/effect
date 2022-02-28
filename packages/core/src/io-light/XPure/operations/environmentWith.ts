import { XPure } from "../definition"

/**
 * Access the environment with the specified function.
 *
 * @tsplus static ets/XPureOps environmentWith
 */
export function environmentWith<R, A, S>(
  f: (_: R) => A
): XPure<never, S, S, R, never, A> {
  return XPure.environmentWithXPure((r: R) => XPure.succeed(f(r)))
}
