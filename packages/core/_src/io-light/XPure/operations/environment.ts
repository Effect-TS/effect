/**
 * Access the environment.
 *
 * @tsplus static ets/XPure/Ops environment
 */
export function environment<R>(): XPure<never, unknown, unknown, R, never, Env<R>> {
  return XPure.environmentWithXPure((env: Env<R>) => XPure.succeed(env));
}
