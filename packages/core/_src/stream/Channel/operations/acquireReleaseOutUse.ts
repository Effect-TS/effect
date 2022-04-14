/**
 * @tsplus static ets/Channel/Ops acquireReleaseOutUse
 */
export function acquireReleaseOutUse<Env, OutErr, Acquired, Z>(
  acquire: Effect<Env, OutErr, Acquired>,
  release: (a: Acquired) => Effect.RIO<Env, Z>
): Channel<Env, unknown, unknown, unknown, OutErr, Acquired, void> {
  return Channel.acquireReleaseOutExitUse(acquire, (z, _) => release(z));
}
