/**
 * Access the environment.
 *
 * @tsplus static ets/XPure/Ops environment
 */
export function environment<R>(): XPure<never, unknown, unknown, R, never, R> {
  return XPure.environmentWithXPure((r: R) => XPure.succeed(r));
}
