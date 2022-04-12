/**
 * Access the environment with the specified function.
 *
 * @tsplus static ets/XPure/Ops environmentWith
 */
export function environmentWith<R, A, S>(
  f: (env: Env<R>) => A
): XPure<never, S, S, R, never, A> {
  return XPure.environmentWithXPure((env: Env<R>) => XPure.succeed(f(env)));
}
