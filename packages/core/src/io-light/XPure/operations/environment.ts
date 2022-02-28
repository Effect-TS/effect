import { XPure } from "../definition"

/**
 * Access the environment.
 *
 * @tsplus static ets/XPureOps environment
 */
export function environment<R>(): XPure<never, unknown, unknown, R, never, R> {
  return XPure.environmentWithXPure((r: R) => XPure.succeed(r))
}
