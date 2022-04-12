/**
 * Access the environment.
 *
 * @tsplus static ets/Sync environment
 */
export function environment<R>(): Sync<R, never, Env<R>> {
  return XPure.environment<R>();
}
